import {
  type BitbucketApiErrorOptions,
  BitbucketErrorCodes,
} from "@openbeam/types/services/connectors/bitbucket";

export { BitbucketErrorCodes };

export class BitbucketApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;
  readonly status?: number;

  constructor(options: BitbucketApiErrorOptions) {
    super(options.message);
    this.name = "BitbucketApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
    this.status = options.status;
  }

  static fromHttpResponse(
    status: number,
    body: { error?: { message?: string } }
  ): BitbucketApiError {
    const message = body.error?.message ?? `Bitbucket API error: ${status}`;

    if (status === 401) {
      return new BitbucketApiError({
        message,
        code: BitbucketErrorCodes.UNAUTHORIZED,
        retryable: false,
        status,
      });
    }

    if (status === 403) {
      return new BitbucketApiError({
        message,
        code: BitbucketErrorCodes.FORBIDDEN,
        retryable: false,
        status,
      });
    }

    if (status === 404) {
      return new BitbucketApiError({
        message,
        code: BitbucketErrorCodes.NOT_FOUND,
        retryable: false,
        status,
      });
    }

    if (status === 429) {
      return new BitbucketApiError({
        message,
        code: BitbucketErrorCodes.RATE_LIMITED,
        retryable: true,
        status,
      });
    }

    if (status >= 500) {
      return new BitbucketApiError({
        message,
        code: BitbucketErrorCodes.INTERNAL_ERROR,
        retryable: true,
        status,
      });
    }

    return new BitbucketApiError({ message, code: "UNKNOWN", status });
  }

  static isAuthError(code: string): boolean {
    return (
      code === BitbucketErrorCodes.UNAUTHORIZED ||
      code === BitbucketErrorCodes.FORBIDDEN
    );
  }

  static isRateLimitError(code: string): boolean {
    return code === BitbucketErrorCodes.RATE_LIMITED;
  }
}
