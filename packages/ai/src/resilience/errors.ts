import type { ClassifiedError, ErrorCode } from "./types";
import { RETRYABLE_ERROR_CODES } from "./types";

const RETRY_AFTER_PATTERNS = [
  /retry.?after[:\s]+(\d+)/i,
  /(\d+)\s*(?:seconds?|s)\s*(?:before|until)/i,
  /wait\s+(\d+)/i,
] as const;

interface ErrorPattern {
  keywords: string[];
  code: ErrorCode;
  retryable: boolean;
  nameKeywords?: string[];
}

const ERROR_PATTERNS: ErrorPattern[] = [
  { keywords: ["rate limit", "429"], code: "RATE_LIMITED", retryable: true },
  {
    keywords: ["timeout", "timed out"],
    code: "TIMEOUT",
    retryable: true,
    nameKeywords: ["timeout"],
  },
  {
    keywords: ["network", "econnrefused", "enotfound", "fetch failed"],
    code: "NETWORK_ERROR",
    retryable: true,
    nameKeywords: ["fetch"],
  },
  {
    keywords: ["unauthorized", "401", "invalid api key", "authentication"],
    code: "AUTHENTICATION_ERROR",
    retryable: false,
  },
  {
    keywords: ["quota", "billing", "exceeded"],
    code: "QUOTA_EXCEEDED",
    retryable: false,
  },
  {
    keywords: ["overloaded", "503", "capacity"],
    code: "MODEL_OVERLOADED",
    retryable: true,
  },
  {
    keywords: ["context length", "token limit", "too long"],
    code: "CONTEXT_LENGTH_EXCEEDED",
    retryable: false,
  },
  {
    keywords: ["invalid", "400", "bad request"],
    code: "INVALID_REQUEST",
    retryable: false,
  },
  {
    keywords: ["500", "502", "internal", "server error"],
    code: "PROVIDER_ERROR",
    retryable: true,
  },
];

export function classifyError(
  error: unknown,
  provider?: string
): ClassifiedError {
  if (error instanceof AIProviderError) {
    return {
      code: error.code,
      message: error.message,
      retryable: RETRYABLE_ERROR_CODES.has(error.code),
      retryAfterMs: error.retryAfterMs,
      provider: error.provider ?? provider,
      originalError: error,
    };
  }

  if (error instanceof Error) {
    const classified = classifyErrorMessage(error.message, error.name);
    return {
      ...classified,
      provider,
      originalError: error,
    };
  }

  return {
    code: "UNKNOWN",
    message: String(error),
    retryable: false,
    provider,
    originalError: error,
  };
}

function matchesPattern(
  lowerMessage: string,
  lowerName: string,
  pattern: ErrorPattern
): boolean {
  const messageMatch = pattern.keywords.some((kw) => lowerMessage.includes(kw));
  if (messageMatch) {
    return true;
  }

  if (pattern.nameKeywords) {
    return pattern.nameKeywords.some((kw) => lowerName.includes(kw));
  }

  return false;
}

function matchesContentFilter(lowerMessage: string): boolean {
  return (
    lowerMessage.includes("content") &&
    (lowerMessage.includes("filter") || lowerMessage.includes("blocked"))
  );
}

function classifyErrorMessage(
  message: string,
  name?: string
): Omit<ClassifiedError, "provider" | "originalError"> {
  const lowerMessage = message.toLowerCase();
  const lowerName = name?.toLowerCase() ?? "";

  if (matchesContentFilter(lowerMessage)) {
    return { code: "CONTENT_FILTERED", message, retryable: false };
  }

  for (const pattern of ERROR_PATTERNS) {
    if (matchesPattern(lowerMessage, lowerName, pattern)) {
      const retryAfterMs =
        pattern.code === "RATE_LIMITED"
          ? extractRetryAfter(message)
          : undefined;
      return {
        code: pattern.code,
        message,
        retryable: pattern.retryable,
        retryAfterMs,
      };
    }
  }

  return { code: "UNKNOWN", message, retryable: false };
}

function extractRetryAfter(message: string): number | undefined {
  for (const pattern of RETRY_AFTER_PATTERNS) {
    const match = message.match(pattern);
    const value = match?.[1];
    if (value) {
      const seconds = Number.parseInt(value, 10);
      if (!Number.isNaN(seconds) && seconds > 0 && seconds < 3600) {
        return seconds * 1000;
      }
    }
  }
  return;
}

export class AIProviderError extends Error {
  readonly code: ErrorCode;
  readonly provider?: string;
  readonly retryAfterMs?: number;

  constructor(
    code: ErrorCode,
    message: string,
    provider?: string,
    retryAfterMs?: number
  ) {
    super(message);
    this.name = "AIProviderError";
    this.code = code;
    this.provider = provider;
    this.retryAfterMs = retryAfterMs;
  }

  static rateLimited(provider: string, retryAfterMs?: number): AIProviderError {
    return new AIProviderError(
      "RATE_LIMITED",
      `Rate limited by ${provider}`,
      provider,
      retryAfterMs
    );
  }

  static timeout(provider: string): AIProviderError {
    return new AIProviderError(
      "TIMEOUT",
      `Request to ${provider} timed out`,
      provider
    );
  }

  static networkError(provider: string, details?: string): AIProviderError {
    return new AIProviderError(
      "NETWORK_ERROR",
      `Network error connecting to ${provider}${details ? `: ${details}` : ""}`,
      provider
    );
  }

  static authenticationError(provider: string): AIProviderError {
    return new AIProviderError(
      "AUTHENTICATION_ERROR",
      `Authentication failed for ${provider}`,
      provider
    );
  }

  static quotaExceeded(provider: string): AIProviderError {
    return new AIProviderError(
      "QUOTA_EXCEEDED",
      `Quota exceeded for ${provider}`,
      provider
    );
  }

  static modelOverloaded(provider: string): AIProviderError {
    return new AIProviderError(
      "MODEL_OVERLOADED",
      `${provider} model is overloaded`,
      provider
    );
  }

  static contentFiltered(provider: string): AIProviderError {
    return new AIProviderError(
      "CONTENT_FILTERED",
      `Content was filtered by ${provider}`,
      provider
    );
  }

  static contextLengthExceeded(
    provider: string,
    limit?: number
  ): AIProviderError {
    return new AIProviderError(
      "CONTEXT_LENGTH_EXCEEDED",
      `Context length exceeded${limit ? ` (max: ${limit})` : ""} for ${provider}`,
      provider
    );
  }

  static invalidRequest(provider: string, details?: string): AIProviderError {
    return new AIProviderError(
      "INVALID_REQUEST",
      `Invalid request to ${provider}${details ? `: ${details}` : ""}`,
      provider
    );
  }

  static providerError(provider: string, details?: string): AIProviderError {
    return new AIProviderError(
      "PROVIDER_ERROR",
      `${provider} returned an error${details ? `: ${details}` : ""}`,
      provider
    );
  }
}

export function isRetryableError(error: unknown): boolean {
  const classified = classifyError(error);
  return classified.retryable;
}

export function getRetryDelay(error: unknown): number | undefined {
  const classified = classifyError(error);
  return classified.retryAfterMs;
}
