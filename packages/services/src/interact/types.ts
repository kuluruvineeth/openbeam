export interface InteractApiErrorOptions {
  message: string;
  code: string;
  statusCode?: number;
  retryable?: boolean;
  retryAfter?: number;
}

export class InteractApiError extends Error {
  readonly code: string;
  readonly statusCode?: number;
  readonly retryable: boolean;
  readonly retryAfter?: number;

  constructor(options: InteractApiErrorOptions) {
    super(options.message);
    this.name = "InteractApiError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
  }

  static isAuthError(code: string): boolean {
    return code === "UNAUTHORIZED" || code === "FORBIDDEN";
  }
}
