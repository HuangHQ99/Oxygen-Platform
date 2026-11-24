package com.oxygenplatform.identity;

/** Stable lookup key used to join an authenticated principal to Oxygen personnel. */
public record AuthenticatedIdentity(String provider, String subject) {}
