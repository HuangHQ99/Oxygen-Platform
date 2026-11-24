package com.oxygenplatform.identity;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Component;

/** Converts local and Cognito principals into database identity keys. */
@Component
public class AuthenticatedIdentityResolver {

  /** Resolves the authenticated principal to a stable identity-provider key. */
  public AuthenticatedIdentity resolve(Authentication authentication) {
    if (authentication.getPrincipal() instanceof OidcUser oidcUser) {
      return new AuthenticatedIdentity("cognito", oidcUser.getSubject());
    }
    return new AuthenticatedIdentity("demo", authentication.getName());
  }
}
