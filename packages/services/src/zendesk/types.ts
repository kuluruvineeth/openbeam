export class ZendeskApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;

  constructor(params: {
    message: string;
    statusCode: number;
    code: string;
    retryable?: boolean;
    retryAfter?: number;
  }) {
    super(params.message);
    this.name = "ZendeskApiError";
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.retryable = params.retryable ?? false;
    this.retryAfter = params.retryAfter;
  }

  static isAuthError(code: string): boolean {
    return code === "UNAUTHORIZED" || code === "FORBIDDEN";
  }
}
