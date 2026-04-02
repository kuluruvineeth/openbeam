export class OpenBeamError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "OpenBeamError";
    this.status = status;
    this.code = code;
  }
}

export class AuthenticationError extends OpenBeamError {
  constructor(message = "Invalid or missing API key") {
    super(message, 401, "authentication_error");
    this.name = "AuthenticationError";
  }
}

export class PermissionError extends OpenBeamError {
  constructor(message = "Insufficient permissions") {
    super(message, 403, "permission_error");
    this.name = "PermissionError";
  }
}

export class NotFoundError extends OpenBeamError {
  constructor(message = "Resource not found") {
    super(message, 404, "not_found");
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends OpenBeamError {
  readonly retryAfter: number | null;

  constructor(
    message = "Rate limit exceeded",
    retryAfter: number | null = null
  ) {
    super(message, 429, "rate_limit_error");
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class ServerError extends OpenBeamError {
  constructor(message = "Internal server error") {
    super(message, 500, "server_error");
    this.name = "ServerError";
  }
}

export class ToolError extends OpenBeamError {
  constructor(message: string) {
    super(message, 422, "tool_error");
    this.name = "ToolError";
  }
}
