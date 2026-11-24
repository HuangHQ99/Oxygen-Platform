package com.oxygenplatform.assets;

import com.oxygenplatform.application.workspace.AssetView;
import com.oxygenplatform.application.workspace.WorkspaceQuery;
import com.oxygenplatform.identity.AuthenticatedIdentity;
import com.oxygenplatform.identity.AuthenticatedIdentityResolver;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Minimal W02-03 endpoint proving that asset reads are authorized on the server. */
@RestController
@RequestMapping("/api/v1/clients/{clientId}/assets")
public class AssetController {

  private final WorkspaceQuery workspaceQuery;
  private final AuthenticatedIdentityResolver identityResolver;

  /** Creates the server-authorized asset endpoint. */
  public AssetController(
      WorkspaceQuery workspaceQuery, AuthenticatedIdentityResolver identityResolver) {
    this.workspaceQuery = workspaceQuery;
    this.identityResolver = identityResolver;
  }

  /** Returns an asset only when the current grant covers its client and data centre. */
  @GetMapping("/{assetId}")
  public AssetView getAsset(
      @PathVariable UUID clientId,
      @PathVariable UUID assetId,
      Authentication authentication) {
    AuthenticatedIdentity identity = identityResolver.resolve(authentication);
    return workspaceQuery
        .findAsset(identity.provider(), identity.subject(), clientId, assetId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
  }
}
