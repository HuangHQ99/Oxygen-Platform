package com.oxygenplatform.application.workspace;

import java.util.Optional;
import java.util.UUID;

/** Reads the authenticated user's workspace and assets within effective grants. */
public interface WorkspaceQuery {

  WorkspaceSnapshot loadWorkspace(String identityProvider, String subject);

  Optional<AssetView> findAsset(
      String identityProvider, String subject, UUID clientId, UUID assetId);
}
