package com.oxygenplatform.navigation;

import com.oxygenplatform.application.workspace.WorkspaceQuery;
import com.oxygenplatform.application.workspace.WorkspaceSnapshot;
import com.oxygenplatform.identity.AuthenticatedIdentity;
import com.oxygenplatform.identity.AuthenticatedIdentityResolver;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Supplies the current workspace from authenticated, active database grants. */
@RestController
@RequestMapping("/api/v1/navigation")
public class NavigationBootstrapController {

  private final WorkspaceQuery workspaceQuery;
  private final AuthenticatedIdentityResolver identityResolver;
  private final boolean demoMode;

  /** Creates the authenticated workspace endpoint. */
  public NavigationBootstrapController(
      WorkspaceQuery workspaceQuery,
      AuthenticatedIdentityResolver identityResolver,
      @Value("${oxygen.auth.mode:demo}") String authMode) {
    this.workspaceQuery = workspaceQuery;
    this.identityResolver = identityResolver;
    this.demoMode = "demo".equals(authMode);
  }

  /** Returns only clients and data centres covered by the caller's effective grants. */
  @GetMapping("/bootstrap")
  public WorkspaceBootstrap bootstrap(Authentication authentication) {
    AuthenticatedIdentity identity = identityResolver.resolve(authentication);
    WorkspaceSnapshot workspace =
        workspaceQuery.loadWorkspace(identity.provider(), identity.subject());
    return new WorkspaceBootstrap(
        demoMode,
        workspace.provider(),
        workspace.actor(),
        workspace.initialClientId(),
        workspace.grants());
  }

  /** Navigation response with an explicit local-demo marker. */
  public record WorkspaceBootstrap(
      boolean demoMode,
      WorkspaceSnapshot.ProviderView provider,
      WorkspaceSnapshot.ActorView actor,
      UUID initialClientId,
      List<WorkspaceSnapshot.ClientGrantView> grants) {}
}
