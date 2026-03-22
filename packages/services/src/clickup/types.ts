export const ClickUpErrorCodes = {
  RATE_LIMITED: "RATE_LIMITED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ClickUpErrorCode =
  (typeof ClickUpErrorCodes)[keyof typeof ClickUpErrorCodes];

export interface ClickUpApiErrorOptions {
  message: string;
  code: string;
  retryable?: boolean;
  retryAfter?: number;
  statusCode?: number;
}

export class ClickUpApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;
  readonly statusCode?: number;

  constructor(options: ClickUpApiErrorOptions) {
    super(options.message);
    this.name = "ClickUpApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
    this.statusCode = options.statusCode;
  }

  static fromResponse(status: number, body: string): ClickUpApiError {
    if (status === 429) {
      return new ClickUpApiError({
        message: "Rate limited",
        code: ClickUpErrorCodes.RATE_LIMITED,
        retryable: true,
        retryAfter: 60,
        statusCode: status,
      });
    }
    if (status === 401) {
      return new ClickUpApiError({
        message: "Unauthorized",
        code: ClickUpErrorCodes.UNAUTHORIZED,
        retryable: false,
        statusCode: status,
      });
    }
    if (status === 403) {
      return new ClickUpApiError({
        message: "Forbidden",
        code: ClickUpErrorCodes.FORBIDDEN,
        retryable: false,
        statusCode: status,
      });
    }
    if (status === 404) {
      return new ClickUpApiError({
        message: "Not found",
        code: ClickUpErrorCodes.NOT_FOUND,
        retryable: false,
        statusCode: status,
      });
    }
    return new ClickUpApiError({
      message: `ClickUp API error ${status}: ${body}`,
      code: ClickUpErrorCodes.INTERNAL_ERROR,
      retryable: status >= 500,
      statusCode: status,
    });
  }

  static isAuthError(code: string): boolean {
    return (
      code === ClickUpErrorCodes.UNAUTHORIZED ||
      code === ClickUpErrorCodes.FORBIDDEN
    );
  }

  static isRateLimitError(code: string): boolean {
    return code === ClickUpErrorCodes.RATE_LIMITED;
  }
}
