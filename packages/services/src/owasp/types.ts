import type { OwaspErrorCode } from "@openbeam/types/services/connectors/owasp";

export interface OwaspApiErrorOptions {
  message: string;
  code: OwaspErrorCode;
  retryable?: boolean;
  retryAfter?: number;
  statusCode?: number;
}

export class OwaspApiError extends Error {
  readonly code: OwaspErrorCode;
  readonly retryable: boolean;
  readonly retryAfter?: number;
  readonly statusCode?: number;

  constructor(options: OwaspApiErrorOptions) {
    super(options.message);
    this.name = "OwaspApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
    this.statusCode = options.statusCode;
  }

  static fromResponse(status: number, message: string): OwaspApiError {
    if (status === 403 || status === 429) {
      return new OwaspApiError({
        message,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter: 60,
        statusCode: status,
      });
    }

    return new OwaspApiError({
      message,
      code: "FETCH_FAILED",
      retryable: status >= 500,
      statusCode: status,
    });
  }
}
