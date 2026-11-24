package com.oxygenplatform.application.workspace;

import java.util.List;
import java.util.UUID;

/** Authenticated navigation context assembled from current database grants. */
public record WorkspaceSnapshot(
    ProviderView provider, ActorView actor, UUID initialClientId, List<ClientGrantView> grants) {

  /** Service provider visible to the authenticated account. */
  public record ProviderView(UUID id, String name) {}

  /** Immutable display details for the authenticated Oxygen user. */
  public record ActorView(UUID id, String name, String position) {}

  /** One active client authorization and its server-filtered data-centre scope. */
  public record ClientGrantView(
      UUID clientId,
      String clientCode,
      String clientName,
      List<String> roles,
      List<DataCentreView> dataCentres) {}

  /** Data centre covered by the enclosing client authorization. */
  public record DataCentreView(UUID id, String code, String name, String timeZone) {}
}
