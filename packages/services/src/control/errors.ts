export type ControlServiceErrorCode =
  | "CONFLICT"
  | "FORBIDDEN"
  | "INVALID_STATE"
  | "MISSING_TEAM"
  | "NOT_FOUND"
  | "NO_TEAM_USER"
  | "UNPROCESSABLE"
  | "BUDGET_EXCEEDED";

export class ControlServiceError extends Error {
  readonly code: ControlServiceErrorCode;

  constructor(code: ControlServiceErrorCode, message: string) {
    super(message);
    this.name = "ControlServiceError";
    this.code = code;
  }

  static notFound(resource: string): ControlServiceError {
    return new ControlServiceError("NOT_FOUND", `${resource} not found`);
  }

  static conflict(message: string): ControlServiceError {
    return new ControlServiceError("CONFLICT", message);
  }

  static invalidState(message: string): ControlServiceError {
    return new ControlServiceError("INVALID_STATE", message);
  }

  static forbidden(message: string): ControlServiceError {
    return new ControlServiceError("FORBIDDEN", message);
  }

  static unprocessable(message: string): ControlServiceError {
    return new ControlServiceError("UNPROCESSABLE", message);
  }

  static budgetExceeded(message: string): ControlServiceError {
    return new ControlServiceError("BUDGET_EXCEEDED", message);
  }
}

export function ensureTeamId(teamId: string | null): string {
  if (!teamId) {
    throw new ControlServiceError("MISSING_TEAM", "team_id is required");
  }
  return teamId;
}
