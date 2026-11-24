package com.oxygenplatform.infrastructure.workspace;

import com.oxygenplatform.application.workspace.AssetView;
import com.oxygenplatform.application.workspace.WorkspaceQuery;
import com.oxygenplatform.application.workspace.WorkspaceSnapshot;
import com.oxygenplatform.application.workspace.WorkspaceSnapshot.ActorView;
import com.oxygenplatform.application.workspace.WorkspaceSnapshot.ClientGrantView;
import com.oxygenplatform.application.workspace.WorkspaceSnapshot.DataCentreView;
import com.oxygenplatform.application.workspace.WorkspaceSnapshot.ProviderView;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** PostgreSQL implementation that always scopes reads through the caller's current grant. */
@Repository
public class JdbcWorkspaceQuery implements WorkspaceQuery {

  private final JdbcClient jdbcClient;
  private final Clock clock;

  public JdbcWorkspaceQuery(JdbcClient jdbcClient, Clock clock) {
    this.jdbcClient = jdbcClient;
    this.clock = clock;
  }

  @Override
  public WorkspaceSnapshot loadWorkspace(String identityProvider, String subject) {
    Instant now = clock.instant();
    IdentityRow identity = loadIdentity(identityProvider, subject);
    List<GrantRow> grantRows = loadGrants(identity.userId(), now);
    List<ClientGrantView> grants =
        grantRows.stream()
            .map(
                grant ->
                    new ClientGrantView(
                        grant.clientId(),
                        grant.clientCode(),
                        grant.clientName(),
                        loadRoles(grant.grantId()),
                        loadDataCentres(grant)))
            .toList();
    if (grants.isEmpty()) {
      throw new WorkspaceAccessException("No active client grant");
    }
    return new WorkspaceSnapshot(
        new ProviderView(identity.providerId(), identity.providerName()),
        new ActorView(identity.userId(), identity.displayName(), identity.position()),
        grants.getFirst().clientId(),
        grants);
  }

  @Override
  public Optional<AssetView> findAsset(
      String identityProvider, String subject, UUID clientId, UUID assetId) {
    return jdbcClient
        .sql(
            """
            SELECT a.id, a.client_id, a.data_centre_id, a.asset_code, a.ga_code,
                   a.name, a.equipment_type, a.status
              FROM asset a
              JOIN client_grant g ON g.client_id = a.client_id
              JOIN user_identity i ON i.user_id = g.user_id
             WHERE i.identity_provider = :identityProvider
               AND i.subject = :subject
               AND a.client_id = :clientId
               AND a.id = :assetId
               AND g.status = 'ACTIVE'
               AND g.valid_from <= :now
               AND (g.valid_until IS NULL OR g.valid_until > :now)
               AND (
                    g.all_data_centres
                    OR EXISTS (
                        SELECT 1
                          FROM client_grant_data_centre scope
                         WHERE scope.grant_id = g.id
                           AND scope.client_id = a.client_id
                           AND scope.data_centre_id = a.data_centre_id
                    )
               )
            """)
        .param("identityProvider", identityProvider)
        .param("subject", subject)
        .param("clientId", clientId)
        .param("assetId", assetId)
        .param("now", databaseTime(clock.instant()))
        .query(JdbcWorkspaceQuery::mapAsset)
        .optional();
  }

  private IdentityRow loadIdentity(String identityProvider, String subject) {
    return jdbcClient
        .sql(
            """
            SELECT u.id AS user_id, u.display_name, u.position,
                   p.id AS provider_id, p.name AS provider_name
              FROM user_identity i
              JOIN service_user u ON u.id = i.user_id
              JOIN service_provider p ON p.id = u.provider_id
             WHERE i.identity_provider = :identityProvider
               AND i.subject = :subject
               AND u.active
            """)
        .param("identityProvider", identityProvider)
        .param("subject", subject)
        .query(
            (rs, rowNumber) ->
                new IdentityRow(
                    rs.getObject("user_id", UUID.class),
                    rs.getString("display_name"),
                    rs.getString("position"),
                    rs.getObject("provider_id", UUID.class),
                    rs.getString("provider_name")))
        .optional()
        .orElseThrow(() -> new WorkspaceAccessException("Identity is not linked"));
  }

  private List<GrantRow> loadGrants(UUID userId, Instant now) {
    return jdbcClient
        .sql(
            """
            SELECT g.id AS grant_id, g.client_id, g.all_data_centres,
                   c.code AS client_code, c.name AS client_name
              FROM client_grant g
              JOIN client_account c ON c.id = g.client_id
             WHERE g.user_id = :userId
               AND g.status = 'ACTIVE'
               AND g.valid_from <= :now
               AND (g.valid_until IS NULL OR g.valid_until > :now)
             ORDER BY c.code
            """)
        .param("userId", userId)
        .param("now", databaseTime(now))
        .query(
            (rs, rowNumber) ->
                new GrantRow(
                    rs.getObject("grant_id", UUID.class),
                    rs.getObject("client_id", UUID.class),
                    rs.getString("client_code"),
                    rs.getString("client_name"),
                    rs.getBoolean("all_data_centres")))
        .list();
  }

  private List<String> loadRoles(UUID grantId) {
    return jdbcClient
        .sql(
            """
            SELECT role_code
              FROM client_grant_role
             WHERE grant_id = :grantId
             ORDER BY role_code
            """)
        .param("grantId", grantId)
        .query(String.class)
        .list();
  }

  private List<DataCentreView> loadDataCentres(GrantRow grant) {
    return jdbcClient
        .sql(
            """
            SELECT dc.id, dc.code, dc.name, dc.time_zone
              FROM data_centre dc
             WHERE dc.client_id = :clientId
               AND (
                    :allDataCentres
                    OR EXISTS (
                        SELECT 1
                          FROM client_grant_data_centre scope
                         WHERE scope.grant_id = :grantId
                           AND scope.client_id = dc.client_id
                           AND scope.data_centre_id = dc.id
                    )
               )
             ORDER BY dc.code
            """)
        .param("clientId", grant.clientId())
        .param("allDataCentres", grant.allDataCentres())
        .param("grantId", grant.grantId())
        .query(
            (rs, rowNumber) ->
                new DataCentreView(
                    rs.getObject("id", UUID.class),
                    rs.getString("code"),
                    rs.getString("name"),
                    rs.getString("time_zone")))
        .list();
  }

  private static AssetView mapAsset(ResultSet rs, int rowNumber) throws SQLException {
    return new AssetView(
        rs.getObject("id", UUID.class),
        rs.getObject("client_id", UUID.class),
        rs.getObject("data_centre_id", UUID.class),
        rs.getString("asset_code"),
        rs.getString("ga_code"),
        rs.getString("name"),
        rs.getString("equipment_type"),
        rs.getString("status"));
  }

  private static OffsetDateTime databaseTime(Instant instant) {
    return instant.atOffset(ZoneOffset.UTC);
  }

  private record IdentityRow(
      UUID userId,
      String displayName,
      String position,
      UUID providerId,
      String providerName) {}

  private record GrantRow(
      UUID grantId,
      UUID clientId,
      String clientCode,
      String clientName,
      boolean allDataCentres) {}
}
