export interface S3ApiErrorOptions {
  message: string;
  code: string;
  retryable?: boolean;
  retryAfter?: number;
}

export class S3ApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;

  constructor(options: S3ApiErrorOptions) {
    super(options.message);
    this.name = "S3ApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
  }

  static isAuthError(code: string): boolean {
    return code === "UNAUTHORIZED" || code === "FORBIDDEN";
  }

  static isRateLimitError(code: string): boolean {
    return code === "RATE_LIMITED" || code === "THROTTLED";
  }
}
