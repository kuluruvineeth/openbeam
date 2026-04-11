export const TelegramErrorCodes = {
  RATE_LIMITED: "rate_limited",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  CHAT_NOT_FOUND: "chat_not_found",
  BOT_BLOCKED: "bot_blocked",
  INTERNAL_ERROR: "internal_error",
} as const;

export type TelegramErrorCode =
  (typeof TelegramErrorCodes)[keyof typeof TelegramErrorCodes];

export class TelegramApiError extends Error {
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
    this.name = "TelegramApiError";
    this.code = code;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
  }

  static fromResponse(
    errorCode?: number,
    description?: string
  ): TelegramApiError {
    if (errorCode === 429) {
      return new TelegramApiError(
        description ?? "Rate limited",
        TelegramErrorCodes.RATE_LIMITED,
        true,
        60
      );
    }
    if (errorCode === 401) {
      return new TelegramApiError(
        "Unauthorized",
        TelegramErrorCodes.UNAUTHORIZED,
        false
      );
    }
    if (errorCode === 403) {
      const blocked = description?.includes("bot was blocked");
      return new TelegramApiError(
        description ?? "Forbidden",
        blocked ? TelegramErrorCodes.BOT_BLOCKED : TelegramErrorCodes.FORBIDDEN,
        false
      );
    }
    return new TelegramApiError(
      description ?? `Telegram API error: ${errorCode}`,
      TelegramErrorCodes.INTERNAL_ERROR,
      (errorCode ?? 0) >= 500
    );
  }

  static isAuthError(code: string): boolean {
    return code === TelegramErrorCodes.UNAUTHORIZED;
  }
}
