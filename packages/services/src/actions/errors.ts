export class ActionExecutorError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly statusCode?: number;
  readonly retryAfterMs?: number;

  constructor(params: {
    code: string;
    message: string;
    retryable: boolean;
    statusCode?: number;
    retryAfterMs?: number;
    cause?: unknown;
  }) {
    super(params.message, { cause: params.cause });
    this.name = "ActionExecutorError";
    this.code = params.code;
    this.retryable = params.retryable;
    this.statusCode = params.statusCode;
    this.retryAfterMs = params.retryAfterMs;
  }
}

export class ActionAuthError extends ActionExecutorError {
  constructor(message: string, cause?: unknown) {
    super({
      code: "AUTH_ERROR",
      message,
      retryable: false,
      statusCode: 401,
      cause,
    });
    this.name = "ActionAuthError";
  }
}

export class ActionRateLimitError extends ActionExecutorError {
  constructor(retryAfterMs: number, cause?: unknown) {
    super({
      code: "RATE_LIMITED",
      message: `Rate limited. Retry after ${retryAfterMs}ms`,
      retryable: true,
      statusCode: 429,
      retryAfterMs,
      cause,
    });
    this.name = "ActionRateLimitError";
  }
}

export class ActionValidationError extends ActionExecutorError {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super({
      code: "VALIDATION_ERROR",
      message,
      retryable: false,
      statusCode: 400,
    });
    this.name = "ActionValidationError";
    this.field = field;
  }
}

export class ActionPermissionError extends ActionExecutorError {
  readonly requiredScopes?: string[];

  constructor(message: string, requiredScopes?: string[]) {
    super({
      code: "PERMISSION_DENIED",
      message,
      retryable: false,
      statusCode: 403,
    });
    this.name = "ActionPermissionError";
    this.requiredScopes = requiredScopes;
  }
}

export class ActionNotFoundError extends ActionExecutorError {
  constructor(connectorType: string, actionId: string) {
    super({
      code: "ACTION_NOT_FOUND",
      message: `Action "${actionId}" not found for connector "${connectorType}"`,
      retryable: false,
      statusCode: 404,
    });
    this.name = "ActionNotFoundError";
  }
}
