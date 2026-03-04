export interface SmartThingsApiErrorOptions {
  message: string;
  code: string;
  retryable?: boolean;
  retryAfter?: number;
}

export class SmartThingsApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;

  constructor(options: SmartThingsApiErrorOptions) {
    super(options.message);
    this.name = "SmartThingsApiError";
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
