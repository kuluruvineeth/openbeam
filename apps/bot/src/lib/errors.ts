export class BotError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 500) {
    super(message);
    this.name = "BotError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class IdentityNotLinkedError extends BotError {
  constructor() {
    super("IDENTITY_NOT_LINKED", "Account not linked to OpenBeam", 401);
    this.name = "IdentityNotLinkedError";
  }
}

export class RateLimitedError extends BotError {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super("RATE_LIMITED", "Too many requests", 429);
    this.name = "RateLimitedError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class InvalidSignatureError extends BotError {
  constructor() {
    super("INVALID_SIGNATURE", "Webhook signature verification failed", 401);
    this.name = "InvalidSignatureError";
  }
}
