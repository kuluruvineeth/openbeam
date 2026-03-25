export interface JFrogApiErrorOptions {
  message: string;
  code: string;
  statusCode?: number;
  retryable?: boolean;
  retryAfter?: number;
}

export class JFrogApiError extends Error {
  readonly code: string;
  readonly statusCode?: number;
  readonly retryable: boolean;
  readonly retryAfter?: number;

  constructor(options: JFrogApiErrorOptions) {
    super(options.message);
    this.name = "JFrogApiError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
  }

  static isAuthError(code: string): boolean {
    return code === "UNAUTHORIZED" || code === "FORBIDDEN";
  }
}
