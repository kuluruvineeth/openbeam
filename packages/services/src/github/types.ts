import {
  type GitHubApiErrorOptions,
  GitHubErrorCodes,
} from "@openplane/types/services/connectors/github";

export { GitHubErrorCodes };

export class GitHubApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;
  readonly status?: number;

  constructor(options: GitHubApiErrorOptions) {
    super(options.message);
    this.name = "GitHubApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
    this.status = options.status;
  }

  static fromHttpResponse(
    status: number,
    body: { message?: string; documentation_url?: string }
  ): GitHubApiError {
    const message = body.message ?? `GitHub API error: ${status}`;

    if (status === 401) {
      return new GitHubApiError({
        message,
        code: GitHubErrorCodes.UNAUTHORIZED,
        retryable: false,
        status,
      });
    }

    if (status === 403) {
      const isRateLimit =
        message.includes("rate limit") || message.includes("abuse");
      return new GitHubApiError({
        message,
        code: isRateLimit
          ? GitHubErrorCodes.RATE_LIMITED
          : GitHubErrorCodes.FORBIDDEN,
        retryable: isRateLimit,
        status,
      });
    }

    if (status === 404) {
      return new GitHubApiError({
        message,
        code: GitHubErrorCodes.NOT_FOUND,
        retryable: false,
        status,
      });
    }

    if (status === 422) {
      return new GitHubApiError({
        message,
        code: GitHubErrorCodes.VALIDATION_ERROR,
        retryable: false,
        status,
      });
    }

    if (status === 429) {
      return new GitHubApiError({
        message,
        code: GitHubErrorCodes.RATE_LIMITED,
        retryable: true,
        status,
      });
    }

    if (status >= 500) {
      return new GitHubApiError({
        message,
        code: GitHubErrorCodes.INTERNAL_ERROR,
        retryable: true,
        status,
      });
    }

    return new GitHubApiError({ message, code: "UNKNOWN", status });
  }

  static isAuthError(code: string): boolean {
    return (
      code === GitHubErrorCodes.UNAUTHORIZED ||
      code === GitHubErrorCodes.FORBIDDEN
    );
  }

  static isRateLimitError(code: string): boolean {
    return (
      code === GitHubErrorCodes.RATE_LIMITED ||
      code === GitHubErrorCodes.ABUSE_LIMIT
    );
  }
}
