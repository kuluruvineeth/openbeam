export interface GongApiErrorOptions {
  message: string;
  code: string;
  retryable?: boolean;
  retryAfter?: number;
}

export class GongApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;

  constructor(options: GongApiErrorOptions) {
    super(options.message);
    this.name = "GongApiError";
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
