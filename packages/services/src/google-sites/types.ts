export const GoogleSitesErrorCodes = {
  RATE_LIMITED: "rateLimitExceeded",
  QUOTA_EXCEEDED: "quotaExceeded",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "notFound",
  INVALID_GRANT: "invalid_grant",
  BACKEND_ERROR: "backendError",
  SERVICE_UNAVAILABLE: "serviceUnavailable",
} as const;

export type GoogleSitesErrorCode =
  (typeof GoogleSitesErrorCodes)[keyof typeof GoogleSitesErrorCodes];

export interface GoogleSitesApiErrorOptions {
  message: string;
  code: string;
  retryable?: boolean;
  retryAfter?: number;
  statusCode?: number;
}

export class GoogleSitesApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;
  readonly statusCode?: number;

  constructor(options: GoogleSitesApiErrorOptions) {
    super(options.message);
    this.name = "GoogleSitesApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
    this.statusCode = options.statusCode;
  }

  static fromResponse(
    statusCode: number,
    errorBody: { error?: { message?: string; code?: number; status?: string } }
  ): GoogleSitesApiError {
    const message =
      errorBody.error?.message ?? `Google Sites API error: ${statusCode}`;
    const status = errorBody.error?.status ?? "UNKNOWN";

    const retryableCodes = [429, 500, 502, 503, 504];
    const retryable = retryableCodes.includes(statusCode);

    let code = status;
    if (statusCode === 401) {
      code = GoogleSitesErrorCodes.UNAUTHORIZED;
    }
    if (statusCode === 403) {
      code = GoogleSitesErrorCodes.FORBIDDEN;
    }
    if (statusCode === 404) {
      code = GoogleSitesErrorCodes.NOT_FOUND;
    }
    if (statusCode === 429) {
      code = GoogleSitesErrorCodes.RATE_LIMITED;
    }

    return new GoogleSitesApiError({ message, code, retryable, statusCode });
  }

  static isAuthError(code: string): boolean {
    return (
      code === GoogleSitesErrorCodes.UNAUTHORIZED ||
      code === GoogleSitesErrorCodes.INVALID_GRANT
    );
  }

  static isQuotaError(code: string): boolean {
    return (
      code === GoogleSitesErrorCodes.RATE_LIMITED ||
      code === GoogleSitesErrorCodes.QUOTA_EXCEEDED
    );
  }
}
