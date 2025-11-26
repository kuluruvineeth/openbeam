/**
 * Token Counter
 *
 * Utilities for counting and estimating tokens.
 */

// Note: In production, use tiktoken for accurate counting
// import { encoding_for_model } from "tiktoken";

/**
 * Approximate tokens per character ratio for different languages
 */
const TOKENS_PER_CHAR: Record<string, number> = {
  en: 0.25, // ~4 chars per token for English
  zh: 0.5, // ~2 chars per token for Chinese
  ja: 0.5, // ~2 chars per token for Japanese
  ko: 0.4, // ~2.5 chars per token for Korean
  ar: 0.4, // ~2.5 chars per token for Arabic
  default: 0.3, // Conservative estimate
};

/**
 * Estimate token count for text
 */
export function estimateTokens(text: string, language = "en"): number {
  const ratio = TOKENS_PER_CHAR[language] || TOKENS_PER_CHAR.default;
  return Math.ceil(text.length * ratio);
}

/**
 * Estimate tokens for a list of messages
 */
export function estimateMessagesTokens(
  messages: Array<{ role: string; content: string }>
): number {
  let tokens = 0;

  for (const msg of messages) {
    // Account for message overhead (role, formatting)
    tokens += 4; // Approximate overhead per message
    tokens += estimateTokens(msg.content);
  }

  // Account for overall formatting
  tokens += 3;

  return tokens;
}

/**
 * Token limits for common models
 */
export const MODEL_LIMITS: Record<string, { context: number; output: number }> =
  {
    // OpenAI
    "gpt-4o": { context: 128_000, output: 16_384 },
    "gpt-4o-mini": { context: 128_000, output: 16_384 },
    "gpt-4-turbo": { context: 128_000, output: 4096 },
    "gpt-4": { context: 8192, output: 8192 },
    "gpt-3.5-turbo": { context: 16_385, output: 4096 },

    // Anthropic
    "claude-sonnet-4-20250514": { context: 200_000, output: 64_000 },
    "claude-3-5-sonnet-20241022": { context: 200_000, output: 8192 },
    "claude-3-5-haiku-20241022": { context: 200_000, output: 8192 },
    "claude-3-opus-20240229": { context: 200_000, output: 4096 },

    // Google
    "gemini-2.0-flash-exp": { context: 1_048_576, output: 8192 },
    "gemini-1.5-pro": { context: 2_097_152, output: 8192 },
    "gemini-1.5-flash": { context: 1_048_576, output: 8192 },
  };

/**
 * Get token limits for a model
 */
export function getModelLimits(model: string): {
  context: number;
  output: number;
} {
  return MODEL_LIMITS[model] || { context: 8192, output: 4096 };
}

/**
 * Check if content fits within token limit
 */
export function fitsWithinLimit(
  text: string,
  limit: number,
  language?: string
): boolean {
  return estimateTokens(text, language) <= limit;
}

/**
 * Truncate text to fit token limit
 */
export function truncateToTokens(
  text: string,
  maxTokens: number,
  language = "en"
): string {
  const ratio = TOKENS_PER_CHAR[language] || TOKENS_PER_CHAR.default;
  const maxChars = Math.floor(maxTokens / ratio);

  if (text.length <= maxChars) {
    return text;
  }

  // Truncate and try to end at a sentence
  let truncated = text.slice(0, maxChars);
  const lastPeriod = truncated.lastIndexOf(".");
  const lastNewline = truncated.lastIndexOf("\n");
  const cutPoint = Math.max(lastPeriod, lastNewline);

  if (cutPoint > maxChars * 0.7) {
    truncated = truncated.slice(0, cutPoint + 1);
  }

  return truncated + "...";
}

/**
 * Calculate how many tokens are available for response
 */
export function getAvailableResponseTokens(
  model: string,
  usedTokens: number
): number {
  const limits = getModelLimits(model);
  const available = limits.context - usedTokens;
  return Math.min(available, limits.output);
}

export default {
  estimateTokens,
  estimateMessagesTokens,
  getModelLimits,
  fitsWithinLimit,
  truncateToTokens,
  getAvailableResponseTokens,
};
