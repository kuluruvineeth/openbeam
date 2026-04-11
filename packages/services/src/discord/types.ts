export const DiscordErrorCodes = {
  RATE_LIMITED: "rate_limited",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not_found",
  CANNOT_SEND_DM: "cannot_send_dm",
  INTERNAL_ERROR: "internal_error",
} as const;

export type DiscordErrorCode =
  (typeof DiscordErrorCodes)[keyof typeof DiscordErrorCodes];

export class DiscordApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;

  constructor(
    message: string,
    code: string,
    retryable = false,
    retryAfter?: number
  ) {
    super(message);
    this.name = "DiscordApiError";
    this.code = code;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
  }

  static fromStatus(status: number, body?: string): DiscordApiError {
    if (status === 429) {
      const retryAfter = body
        ? (JSON.parse(body) as { retry_after?: number }).retry_after
        : undefined;
      return new DiscordApiError(
        "Rate limited",
        DiscordErrorCodes.RATE_LIMITED,
        true,
        retryAfter
      );
    }
    if (status === 401) {
      return new DiscordApiError(
        "Unauthorized",
        DiscordErrorCodes.UNAUTHORIZED,
        false
      );
    }
    if (status === 403) {
      return new DiscordApiError(
        "Forbidden",
        DiscordErrorCodes.FORBIDDEN,
        false
      );
    }
    return new DiscordApiError(
      `Discord API error: ${status}`,
      DiscordErrorCodes.INTERNAL_ERROR,
      status >= 500
    );
  }

  static isAuthError(code: string): boolean {
    return (
      code === DiscordErrorCodes.UNAUTHORIZED ||
      code === DiscordErrorCodes.FORBIDDEN
    );
  }
}
