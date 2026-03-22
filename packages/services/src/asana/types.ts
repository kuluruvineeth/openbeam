export class AsanaApiError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly retryable: boolean;
  readonly retryAfter?: number;

  constructor(opts: {
    message: string;
    code: string;
    statusCode: number;
    retryable: boolean;
    retryAfter?: number;
  }) {
    super(opts.message);
    this.name = "AsanaApiError";
    this.code = opts.code;
    this.statusCode = opts.statusCode;
    this.retryable = opts.retryable;
    this.retryAfter = opts.retryAfter;
  }

  static isAuthError(code: string): boolean {
    return code === "UNAUTHORIZED" || code === "FORBIDDEN";
  }
}
