import type { NvdErrorCode } from "@openbeam/types/services/connectors/nvd";

interface NvdApiErrorOptions {
  message: string;
  code: NvdErrorCode;
  retryable?: boolean;
  retryAfter?: number;
  statusCode?: number;
}

export class NvdApiError extends Error {
  readonly code: NvdErrorCode;
  readonly retryable: boolean;
  readonly retryAfter?: number;
  readonly statusCode?: number;

  constructor(options: NvdApiErrorOptions) {
    super(options.message);
    this.name = "NvdApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
    this.statusCode = options.statusCode;
  }

  static fromHttpStatus(status: number, retryAfter?: number): NvdApiError {
    if (status === 429) {
      return new NvdApiError({
        message: "NVD API rate limit exceeded",
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter: retryAfter ?? 30,
        statusCode: status,
      });
    }

    if (status >= 500) {
      return new NvdApiError({
        message: `NVD API server error: ${status}`,
        code: "SERVER_ERROR",
        retryable: true,
        statusCode: status,
      });
    }

    return new NvdApiError({
      message: `NVD API request failed: ${status}`,
      code: "SERVER_ERROR",
      retryable: false,
      statusCode: status,
    });
  }
}
