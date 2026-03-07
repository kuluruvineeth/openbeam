export { ANTHROPIC_MODELS } from "./anthropic";
export {
  COHERE_EMBEDDING_MODELS,
  DEFAULT_EMBEDDING_MODEL_ID,
  EMBEDDING_MODELS,
  GOOGLE_EMBEDDING_MODELS,
  JINA_EMBEDDING_MODELS,
  OPENAI_EMBEDDING_MODELS,
  OPENBEAM_EMBEDDING_MODELS,
  VOYAGE_EMBEDDING_MODELS,
} from "./embeddings";
export { GOOGLE_MODELS } from "./google";
export {
  BLACKFORESTLABS_IMAGE_MODELS,
  DEFAULT_IMAGE_MODEL_ID,
  GOOGLE_IMAGE_MODELS,
  IMAGE_MODELS,
  OPENAI_IMAGE_MODELS,
  STABILITY_IMAGE_MODELS,
} from "./image";
export { OPENAI_MODELS } from "./openai";
export {
  COHERE_RERANKER_MODELS,
  DEFAULT_RERANKER_MODEL_ID,
  JINA_RERANKER_MODELS,
  OPENBEAM_RERANKER_MODELS,
  RERANKER_MODELS,
} from "./rerankers";
export {
  ASSEMBLYAI_STT_MODELS,
  DEEPGRAM_STT_MODELS,
  DEFAULT_STT_MODEL_ID,
  OPENAI_STT_MODELS,
  STT_MODELS,
} from "./stt";
export {
  CARTESIA_TTS_MODELS,
  DEFAULT_TTS_MODEL_ID,
  ELEVENLABS_TTS_MODELS,
  OPENAI_TTS_MODELS,
  PLAYHT_TTS_MODELS,
  TTS_MODELS,
} from "./tts";
export type {
  ChatModel,
  EmbeddingModel,
  ImageModel,
  ModelPricing,
  ProviderId,
  RerankerModel,
  STTModel,
  TTSModel,
  VideoModel,
  VisionModel,
} from "./types";
export {
  ChatModelSchema,
  EmbeddingModelSchema,
  ImageModelSchema,
  ModelPricingSchema,
  ProviderIdSchema,
  RerankerModelSchema,
  STTModelSchema,
  TTSModelSchema,
  VideoModelSchema,
  VisionModelSchema,
} from "./types";
export {
  DEFAULT_VIDEO_GENERATION_MODEL_ID,
  DEFAULT_VIDEO_UNDERSTANDING_MODEL_ID,
  GOOGLE_VIDEO_MODELS,
  OPENAI_VIDEO_MODELS,
  RUNWAY_VIDEO_MODELS,
  TWELVELABS_VIDEO_MODELS,
  VIDEO_MODELS,
} from "./video";
export {
  ANTHROPIC_VISION_MODELS,
  DEFAULT_VISION_MODEL_ID,
  GOOGLE_VISION_MODELS,
  OPENAI_VISION_MODELS,
  VISION_MODELS,
} from "./vision";

import { ANTHROPIC_MODELS } from "./anthropic";
import { EMBEDDING_MODELS } from "./embeddings";
import { GOOGLE_MODELS } from "./google";
import { IMAGE_MODELS } from "./image";
import { OPENAI_MODELS } from "./openai";
import { RERANKER_MODELS } from "./rerankers";
import { STT_MODELS } from "./stt";
import { TTS_MODELS } from "./tts";
import type {
  ChatModel,
  EmbeddingModel,
  ImageModel,
  ProviderId,
  RerankerModel,
  STTModel,
  TTSModel,
  VideoModel,
  VisionModel,
} from "./types";
import { VIDEO_MODELS } from "./video";
import { VISION_MODELS } from "./vision";

export const CHAT_MODELS: ChatModel[] = [
  ...ANTHROPIC_MODELS,
  ...OPENAI_MODELS,
  ...GOOGLE_MODELS,
];

export const ALL_EMBEDDING_MODELS: EmbeddingModel[] = EMBEDDING_MODELS;
export const ALL_RERANKER_MODELS: RerankerModel[] = RERANKER_MODELS;
export const ALL_TTS_MODELS: TTSModel[] = TTS_MODELS;
export const ALL_STT_MODELS: STTModel[] = STT_MODELS;
export const ALL_VISION_MODELS: VisionModel[] = VISION_MODELS;
export const ALL_VIDEO_MODELS: VideoModel[] = VIDEO_MODELS;
export const ALL_IMAGE_MODELS: ImageModel[] = IMAGE_MODELS;

export function getChatModelsByProvider(provider: ProviderId): ChatModel[] {
  return CHAT_MODELS.filter((m) => m.provider === provider);
}

export function getEmbeddingModelsByProvider(
  provider: ProviderId
): EmbeddingModel[] {
  return ALL_EMBEDDING_MODELS.filter((m) => m.provider === provider);
}

export function getRerankerModelsByProvider(
  provider: ProviderId
): RerankerModel[] {
  return ALL_RERANKER_MODELS.filter((m) => m.provider === provider);
}

export function getTTSModelsByProvider(provider: ProviderId): TTSModel[] {
  return ALL_TTS_MODELS.filter((m) => m.provider === provider);
}

export function getSTTModelsByProvider(provider: ProviderId): STTModel[] {
  return ALL_STT_MODELS.filter((m) => m.provider === provider);
}

export function getVisionModelsByProvider(provider: ProviderId): VisionModel[] {
  return ALL_VISION_MODELS.filter((m) => m.provider === provider);
}

export function getVideoModelsByProvider(provider: ProviderId): VideoModel[] {
  return ALL_VIDEO_MODELS.filter((m) => m.provider === provider);
}

export function getImageModelsByProvider(provider: ProviderId): ImageModel[] {
  return ALL_IMAGE_MODELS.filter((m) => m.provider === provider);
}

export function getChatModel(modelId: string): ChatModel | undefined {
  return CHAT_MODELS.find((m) => m.id === modelId);
}

export function getEmbeddingModel(modelId: string): EmbeddingModel | undefined {
  return ALL_EMBEDDING_MODELS.find((m) => m.id === modelId);
}

export function getRerankerModel(modelId: string): RerankerModel | undefined {
  return ALL_RERANKER_MODELS.find((m) => m.id === modelId);
}

export function getTTSModel(modelId: string): TTSModel | undefined {
  return ALL_TTS_MODELS.find((m) => m.id === modelId);
}

export function getSTTModel(modelId: string): STTModel | undefined {
  return ALL_STT_MODELS.find((m) => m.id === modelId);
}

export function getVisionModel(modelId: string): VisionModel | undefined {
  return ALL_VISION_MODELS.find((m) => m.id === modelId);
}

export function getVideoModel(modelId: string): VideoModel | undefined {
  return ALL_VIDEO_MODELS.find((m) => m.id === modelId);
}

export function getImageModel(modelId: string): ImageModel | undefined {
  return ALL_IMAGE_MODELS.find((m) => m.id === modelId);
}

export function getModelPricing(
  modelId: string
): { inputPer1M?: number; outputPer1M?: number } | undefined {
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

  const inputCostUsd = (inputTokens / 1_000_000) * (pricing.inputPer1M ?? 0);
  const outputCostUsd = (outputTokens / 1_000_000) * (pricing.outputPer1M ?? 0);

  let cacheCostUsd = 0;
  const chatModel = getChatModel(modelId);
  if (options?.cacheTokens && chatModel?.pricing.cachePer1M) {
    cacheCostUsd =
      (options.cacheTokens / 1_000_000) * chatModel.pricing.cachePer1M;
  }

  let reasoningCostUsd = 0;
  if (options?.reasoningTokens && chatModel?.pricing.reasoningPer1M) {
    reasoningCostUsd =
      (options.reasoningTokens / 1_000_000) * chatModel.pricing.reasoningPer1M;
  }

  return {
    inputCostUsd,
    outputCostUsd,
    totalCostUsd:
      inputCostUsd + outputCostUsd + cacheCostUsd + reasoningCostUsd,
  };
}

export const DEFAULT_CHAT_MODEL = "gemini-3-flash-preview";
export const DEFAULT_EMBEDDING_MODEL = "bge-m3";
