export interface AhaApiErrorOptions {
  message: string;
  code: string;
  statusCode?: number;
  retryable?: boolean;
  retryAfter?: number;
}

export class AhaApiError extends Error {
  readonly code: string;
  readonly statusCode?: number;
  readonly retryable: boolean;
  readonly retryAfter?: number;

  constructor(options: AhaApiErrorOptions) {
    super(options.message);
    this.name = "AhaApiError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
  }

  static isAuthError(code: string): boolean {
    return code === "UNAUTHORIZED" || code === "FORBIDDEN";
  }
}
