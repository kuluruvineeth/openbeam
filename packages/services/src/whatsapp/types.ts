export const WhatsAppErrorCodes = {
  RATE_LIMITED: "rate_limited",
  UNAUTHORIZED: "unauthorized",
  INVALID_PARAMETER: "invalid_parameter",
  MESSAGE_UNDELIVERABLE: "message_undeliverable",
  TEMPLATE_NOT_FOUND: "template_not_found",
  INTERNAL_ERROR: "internal_error",
} as const;

export type WhatsAppErrorCode =
  (typeof WhatsAppErrorCodes)[keyof typeof WhatsAppErrorCodes];

export class WhatsAppApiError extends Error {
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
    this.name = "WhatsAppApiError";
    this.code = code;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
  }

  static fromStatus(status: number, body?: string): WhatsAppApiError {
    if (status === 429) {
      return new WhatsAppApiError(
        "Rate limited",
        WhatsAppErrorCodes.RATE_LIMITED,
        true,
        60
      );
    }
    if (status === 401) {
      return new WhatsAppApiError(
        "Unauthorized",
        WhatsAppErrorCodes.UNAUTHORIZED,
        false
      );
    }
    if (status === 400) {
      return new WhatsAppApiError(
        body ?? "Invalid parameter",
        WhatsAppErrorCodes.INVALID_PARAMETER,
        false
      );
    }
    return new WhatsAppApiError(
      `WhatsApp API error: ${status}`,
      WhatsAppErrorCodes.INTERNAL_ERROR,
      status >= 500
    );
  }

  static isAuthError(code: string): boolean {
    return code === WhatsAppErrorCodes.UNAUTHORIZED;
  }
}
