export const MondayErrorCodes = {
  RATE_LIMITED: "RATE_LIMITED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  COMPLEXITY_EXCEEDED: "COMPLEXITY_BUDGET_EXHAUSTED",
  INTERNAL_ERROR: "INTERNAL_SERVER_ERROR",
} as const;

export type MondayErrorCode =
  (typeof MondayErrorCodes)[keyof typeof MondayErrorCodes];

export interface MondayApiErrorOptions {
  message: string;
  code: string;
  retryable?: boolean;
  retryAfter?: number;
  extensions?: Record<string, unknown>;
}

export class MondayApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;
  readonly extensions?: Record<string, unknown>;

  constructor(options: MondayApiErrorOptions) {
    super(options.message);
    this.name = "MondayApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
    this.extensions = options.extensions;
  }

  static fromGraphQLError(error: {
    message: string;
    extensions?: { code?: string; retry_after?: number };
  }): MondayApiError {
    const code = error.extensions?.code ?? "UNKNOWN";
    const retryable =
      code === MondayErrorCodes.RATE_LIMITED ||
      code === MondayErrorCodes.COMPLEXITY_EXCEEDED;
    return new MondayApiError({
      message: error.message,
      code,
      retryable,
      retryAfter: error.extensions?.retry_after,
    });
  }

  static isAuthError(code: string): boolean {
    return (
      code === MondayErrorCodes.UNAUTHORIZED ||
      code === MondayErrorCodes.FORBIDDEN
    );
  }

  static isRateLimitError(code: string): boolean {
    return (
      code === MondayErrorCodes.RATE_LIMITED ||
      code === MondayErrorCodes.COMPLEXITY_EXCEEDED
    );
  }
}
