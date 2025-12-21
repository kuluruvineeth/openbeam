import { encoding_for_model, type TiktokenModel } from "tiktoken";

const DEFAULT_MODEL: TiktokenModel = "text-embedding-3-small";
const EMBEDDING_TOKEN_LIMIT = 8191;

let cachedEncoder: ReturnType<typeof encoding_for_model> | null = null;

function getEncoder(model: TiktokenModel = DEFAULT_MODEL) {
  if (!cachedEncoder) {
    cachedEncoder = encoding_for_model(model);
  }
  return cachedEncoder;
}

export function countTokens(text: string): number {
  const encoder = getEncoder();
  return encoder.encode(text).length;
}

export function truncateToTokenLimit(
  text: string,
  maxTokens: number = EMBEDDING_TOKEN_LIMIT
): string {
  const encoder = getEncoder();
  const tokens = encoder.encode(text);

  if (tokens.length <= maxTokens) {
    return text;
  }

  const truncatedTokens = tokens.slice(0, maxTokens);
  const decoded = new TextDecoder().decode(encoder.decode(truncatedTokens));

  return decoded;
}

export function prepareTextForEmbedding(
  text: string,
  maxTokens: number = EMBEDDING_TOKEN_LIMIT - 100
): string | null {
  if (!text || text.trim().length === 0) {
    return null;
  }

  const cleaned = text.replace(/\s+/g, " ").replace(/\0/g, "").trim();

  if (cleaned.length < 10) {
    return null;
  }

  return truncateToTokenLimit(cleaned, maxTokens);
}

export { EMBEDDING_TOKEN_LIMIT };
