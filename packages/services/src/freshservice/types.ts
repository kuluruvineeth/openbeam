export interface FreshserviceApiErrorOptions {
  message: string;
  code: string;
  retryable?: boolean;
  retryAfter?: number;
}

export class FreshserviceApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;

  constructor(options: FreshserviceApiErrorOptions) {
    super(options.message);
    this.name = "FreshserviceApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
  }

  static isAuthError(code: string): boolean {
    return code === "UNAUTHORIZED" || code === "FORBIDDEN";
  }

  static isRateLimitError(code: string): boolean {
    return code === "RATE_LIMITED";
  }
}
