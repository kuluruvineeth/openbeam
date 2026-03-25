export const LookerStudioErrorCodes = {
  RATE_LIMITED: "rateLimitExceeded",
  QUOTA_EXCEEDED: "quotaExceeded",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "notFound",
  INVALID_GRANT: "invalid_grant",
  BACKEND_ERROR: "backendError",
  SERVICE_UNAVAILABLE: "serviceUnavailable",
} as const;

export type LookerStudioErrorCode =
  (typeof LookerStudioErrorCodes)[keyof typeof LookerStudioErrorCodes];

export interface LookerStudioApiErrorOptions {
  message: string;
  code: string;
  retryable?: boolean;
  retryAfter?: number;
  statusCode?: number;
}

export class LookerStudioApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;
  readonly statusCode?: number;

  constructor(options: LookerStudioApiErrorOptions) {
    super(options.message);
    this.name = "LookerStudioApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
    this.statusCode = options.statusCode;
  }

  static fromResponse(
    statusCode: number,
    errorBody: { error?: { message?: string; code?: number; status?: string } }
  ): LookerStudioApiError {
    const message =
      errorBody.error?.message ?? `Looker Studio API error: ${statusCode}`;
    const status = errorBody.error?.status ?? "UNKNOWN";

    const retryableCodes = [429, 500, 502, 503, 504];
    const retryable = retryableCodes.includes(statusCode);

    let code = status;
    if (statusCode === 401) {
      code = LookerStudioErrorCodes.UNAUTHORIZED;
    }
    if (statusCode === 403) {
      code = LookerStudioErrorCodes.FORBIDDEN;
    }
    if (statusCode === 404) {
      code = LookerStudioErrorCodes.NOT_FOUND;
    }
    if (statusCode === 429) {
      code = LookerStudioErrorCodes.RATE_LIMITED;
    }

    return new LookerStudioApiError({ message, code, retryable, statusCode });
  }

  static isAuthError(code: string): boolean {
    return (
      code === LookerStudioErrorCodes.UNAUTHORIZED ||
      code === LookerStudioErrorCodes.INVALID_GRANT
    );
  }

  static isQuotaError(code: string): boolean {
    return (
      code === LookerStudioErrorCodes.RATE_LIMITED ||
      code === LookerStudioErrorCodes.QUOTA_EXCEEDED
    );
  }
}
