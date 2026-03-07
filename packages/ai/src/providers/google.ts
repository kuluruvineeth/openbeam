import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type {
  ChatModelDefinition,
  EmbeddingModelDefinition,
} from "@openbeam/types/ai";
import {
  getChatModelsByProvider,
  getEmbeddingModelsByProvider,
} from "@openbeam/types/ai";
import type { EmbeddingModel, LanguageModel } from "ai";
import { getConfig } from "../config";
import type { AIProvider } from "./types";

function toChatModelDefinition(
  model: ReturnType<typeof getChatModelsByProvider>[number]
): ChatModelDefinition {
  return {
    id: model.id,
    name: model.name,
    provider: model.provider,
    contextWindow: model.contextWindow,
    maxOutputTokens: model.maxOutputTokens,
    supportsTools: model.supportsTools,
    supportsVision: model.supportsVision,
    supportsStreaming: model.supportsStreaming,
    costPer1kInput: model.pricing.inputPer1M / 1000,
    costPer1kOutput: model.pricing.outputPer1M / 1000,
  };
}

function toEmbeddingModelDefinition(
  model: ReturnType<typeof getEmbeddingModelsByProvider>[number]
): EmbeddingModelDefinition {
  return {
    id: model.id,
    name: model.name,
    provider: model.provider,
    dimensions: model.dimensions,
    maxTokens: model.maxTokens,
    costPer1kTokens: model.pricing.inputPer1M / 1000,
  };
}

const CHAT_MODELS: ChatModelDefinition[] = getChatModelsByProvider(
  "google"
).map(toChatModelDefinition);

const EMBEDDING_MODELS: EmbeddingModelDefinition[] =
  getEmbeddingModelsByProvider("google").map(toEmbeddingModelDefinition);

export function createGoogleProvider(): AIProvider {
  const config = getConfig();
  const providerConfig = config.providers.google;

  const google = createGoogleGenerativeAI({
    apiKey: providerConfig.apiKey,
  });

  return {
    id: "google",
    name: "Google AI",

    getChatModel(modelId: string): LanguageModel {
      return google(modelId);
    },

    getEmbeddingModel(modelId: string): EmbeddingModel {
      return google.textEmbeddingModel(modelId);
    },

    listChatModels(): ChatModelDefinition[] {
      return CHAT_MODELS;
    },

    listEmbeddingModels(): EmbeddingModelDefinition[] {
      return EMBEDDING_MODELS;
    },

    isConfigured(): boolean {
      return !!providerConfig.apiKey;
    },
  };
}
