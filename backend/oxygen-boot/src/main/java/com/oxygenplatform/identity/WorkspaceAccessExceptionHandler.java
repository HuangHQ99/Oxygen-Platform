package com.oxygenplatform.identity;

import com.oxygenplatform.infrastructure.workspace.WorkspaceAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Maps an authenticated account without an active workspace grant to a safe response. */
@RestControllerAdvice
public class WorkspaceAccessExceptionHandler {

  /** Denies access without exposing whether an identity link or grant is missing. */
  @ExceptionHandler(WorkspaceAccessException.class)
  @ResponseStatus(HttpStatus.FORBIDDEN)
  public AccessDeniedResponse denyWorkspaceAccess() {
    return new AccessDeniedResponse("WORKSPACE_ACCESS_DENIED");
  }

  /** Stable machine-readable denial body. */
  public record AccessDeniedResponse(String code) {}
}
