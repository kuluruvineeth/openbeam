export const LINEAR_API_URL = "https://api.linear.app/graphql";

export const LinearErrorCodes = {
  RATE_LIMITED: "RATELIMITED",
  UNAUTHORIZED: "AUTHENTICATION_ERROR",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "GRAPHQL_VALIDATION_FAILED",
  INTERNAL_ERROR: "INTERNAL_SERVER_ERROR",
} as const;

export type LinearErrorCode =
  (typeof LinearErrorCodes)[keyof typeof LinearErrorCodes];

export interface LinearApiErrorOptions {
  message: string;
  code: string;
  retryable?: boolean;
  retryAfter?: number;
  extensions?: Record<string, unknown>;
}

export class LinearApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;
  readonly extensions?: Record<string, unknown>;

  constructor(options: LinearApiErrorOptions) {
    super(options.message);
    this.name = "LinearApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
    this.extensions = options.extensions;
  }

  static fromGraphQLError(error: {
    message: string;
    extensions?: { code?: string; retryAfter?: number };
  }): LinearApiError {
    const code = error.extensions?.code ?? "UNKNOWN";
    const retryable = code === LinearErrorCodes.RATE_LIMITED;
    return new LinearApiError({
      message: error.message,
      code,
      retryable,
      retryAfter: error.extensions?.retryAfter,
    });
  }

  static isAuthError(code: string): boolean {
    return (
      code === LinearErrorCodes.UNAUTHORIZED ||
      code === LinearErrorCodes.FORBIDDEN
    );
  }

  static isRateLimitError(code: string): boolean {
    return code === LinearErrorCodes.RATE_LIMITED;
  }
}
