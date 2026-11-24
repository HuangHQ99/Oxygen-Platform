package com.oxygenplatform.infrastructure.workspace;

/** Raised when an authenticated identity has no active Oxygen workspace link. */
public class WorkspaceAccessException extends RuntimeException {

  public WorkspaceAccessException(String message) {
    super(message);
  }
}
