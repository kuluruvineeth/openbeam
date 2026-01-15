export const GmailErrorCodes = {
  RATE_LIMITED: "rateLimitExceeded",
  QUOTA_EXCEEDED: "quotaExceeded",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "notFound",
  INVALID_GRANT: "invalid_grant",
  BACKEND_ERROR: "backendError",
  SERVICE_UNAVAILABLE: "serviceUnavailable",
  HISTORY_ID_EXPIRED: "historyIdExpired",
} as const;

export type GmailErrorCode =
  (typeof GmailErrorCodes)[keyof typeof GmailErrorCodes];

export class GmailApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;
  readonly statusCode?: number;

  // biome-ignore lint/nursery/useMaxParams: error constructor requires all error details
  constructor(
    message: string,
    code: string,
    retryable = false,
    retryAfter?: number,
    statusCode?: number
  ) {
    super(message);
    this.name = "GmailApiError";
    this.code = code;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
    this.statusCode = statusCode;
  }

  static fromResponse(
    statusCode: number,
    errorBody: { error?: { message?: string; code?: number; status?: string } }
  ): GmailApiError {
    const message =
      errorBody.error?.message ?? `Gmail API error: ${statusCode}`;
    const status = errorBody.error?.status ?? "UNKNOWN";

    const retryableCodes = [429, 500, 502, 503, 504];
    const retryable = retryableCodes.includes(statusCode);

    let code = status;
    if (statusCode === 401) {
      code = GmailErrorCodes.UNAUTHORIZED;
    }
    if (statusCode === 403) {
      code = GmailErrorCodes.FORBIDDEN;
    }
    if (statusCode === 404) {
      code = GmailErrorCodes.NOT_FOUND;
    }
    if (statusCode === 429) {
      code = GmailErrorCodes.RATE_LIMITED;
    }

    return new GmailApiError(message, code, retryable, undefined, statusCode);
  }

  static isAuthError(code: string): boolean {
    return (
      code === GmailErrorCodes.UNAUTHORIZED ||
      code === GmailErrorCodes.INVALID_GRANT
    );
  }

  static isQuotaError(code: string): boolean {
    return (
      code === GmailErrorCodes.RATE_LIMITED ||
      code === GmailErrorCodes.QUOTA_EXCEEDED
    );
  }

  static isHistoryExpired(code: string, message: string): boolean {
    return code === GmailErrorCodes.NOT_FOUND && message.includes("historyId");
  }
}
