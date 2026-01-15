export { ANTHROPIC_MODELS } from "./anthropic";
export {
  EMBEDDING_MODELS,
  GOOGLE_EMBEDDING_MODELS,
  OPENAI_EMBEDDING_MODELS,
} from "./embeddings";
export { GOOGLE_MODELS } from "./google";
export { OPENAI_MODELS } from "./openai";
export type {
  ChatModel,
  EmbeddingModel,
  ModelPricing,
  ProviderId,
} from "./types";
export {
  ChatModelSchema,
  EmbeddingModelSchema,
  ModelPricingSchema,
  ProviderIdSchema,
} from "./types";

import { ANTHROPIC_MODELS } from "./anthropic";
import { EMBEDDING_MODELS } from "./embeddings";
import { GOOGLE_MODELS } from "./google";
import { OPENAI_MODELS } from "./openai";
import type {
  ChatModel,
  EmbeddingModel,
  ModelPricing,
  ProviderId,
} from "./types";

export const CHAT_MODELS: ChatModel[] = [
  ...ANTHROPIC_MODELS,
  ...OPENAI_MODELS,
  ...GOOGLE_MODELS,
];

export const ALL_EMBEDDING_MODELS: EmbeddingModel[] = EMBEDDING_MODELS;

export function getChatModelsByProvider(provider: ProviderId): ChatModel[] {
  return CHAT_MODELS.filter((m) => m.provider === provider);
}

export function getEmbeddingModelsByProvider(
  provider: ProviderId
): EmbeddingModel[] {
  return ALL_EMBEDDING_MODELS.filter((m) => m.provider === provider);
}

export function getChatModel(modelId: string): ChatModel | undefined {
  return CHAT_MODELS.find((m) => m.id === modelId);
}

export function getEmbeddingModel(modelId: string): EmbeddingModel | undefined {
  return ALL_EMBEDDING_MODELS.find((m) => m.id === modelId);
}

export function getModelPricing(modelId: string): ModelPricing | undefined {
  const chatModel = getChatModel(modelId);
  if (chatModel) {
    return chatModel.pricing;
  }

  const embeddingModel = getEmbeddingModel(modelId);
  if (embeddingModel) {
    return { inputPer1M: embeddingModel.pricing.inputPer1M, outputPer1M: 0 };
  }

  return;
}

export function calculateModelCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  options?: { cacheTokens?: number; reasoningTokens?: number }
): { inputCostUsd: number; outputCostUsd: number; totalCostUsd: number } {
  const pricing = getModelPricing(modelId);

  if (!pricing) {
    return { inputCostUsd: 0, outputCostUsd: 0, totalCostUsd: 0 };
  }

  const inputCostUsd = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCostUsd = (outputTokens / 1_000_000) * pricing.outputPer1M;

  let cacheCostUsd = 0;
  if (options?.cacheTokens && pricing.cachePer1M) {
    cacheCostUsd = (options.cacheTokens / 1_000_000) * pricing.cachePer1M;
  }

  let reasoningCostUsd = 0;
  if (options?.reasoningTokens && pricing.reasoningPer1M) {
    reasoningCostUsd =
      (options.reasoningTokens / 1_000_000) * pricing.reasoningPer1M;
  }

  return {
    inputCostUsd,
    outputCostUsd,
    totalCostUsd:
      inputCostUsd + outputCostUsd + cacheCostUsd + reasoningCostUsd,
  };
}

export const DEFAULT_CHAT_MODEL = "gpt-5.2";
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
