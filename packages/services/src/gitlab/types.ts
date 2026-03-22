import {
  type GitLabApiErrorOptions,
  GitLabErrorCodes,
} from "@openbeam/types/services/connectors/gitlab";

export { GitLabErrorCodes };

export class GitLabApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;
  readonly status?: number;

  constructor(options: GitLabApiErrorOptions) {
    super(options.message);
    this.name = "GitLabApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
    this.status = options.status;
  }

  static fromHttpResponse(
    status: number,
    body: { message?: string; error?: string }
  ): GitLabApiError {
    const message = body.message ?? body.error ?? `GitLab API error: ${status}`;

    if (status === 401) {
      return new GitLabApiError({
        message,
        code: GitLabErrorCodes.UNAUTHORIZED,
        retryable: false,
        status,
      });
    }

    if (status === 403) {
      return new GitLabApiError({
        message,
        code: GitLabErrorCodes.FORBIDDEN,
        retryable: false,
        status,
      });
    }

    if (status === 404) {
      return new GitLabApiError({
        message,
        code: GitLabErrorCodes.NOT_FOUND,
        retryable: false,
        status,
      });
    }

    if (status === 422) {
      return new GitLabApiError({
        message,
        code: GitLabErrorCodes.VALIDATION_ERROR,
        retryable: false,
        status,
      });
    }

    if (status === 429) {
      return new GitLabApiError({
        message,
        code: GitLabErrorCodes.RATE_LIMITED,
        retryable: true,
        status,
      });
    }

    if (status >= 500) {
      return new GitLabApiError({
        message,
        code: GitLabErrorCodes.INTERNAL_ERROR,
        retryable: true,
        status,
      });
    }

    return new GitLabApiError({ message, code: "UNKNOWN", status });
  }

  static isAuthError(code: string): boolean {
    return (
      code === GitLabErrorCodes.UNAUTHORIZED ||
      code === GitLabErrorCodes.FORBIDDEN
    );
  }

  static isRateLimitError(code: string): boolean {
    return code === GitLabErrorCodes.RATE_LIMITED;
  }
}
