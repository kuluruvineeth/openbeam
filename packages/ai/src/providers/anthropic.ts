import { createAnthropic } from "@ai-sdk/anthropic";
import type { EmbeddingModel, LanguageModel } from "ai";
import { getConfig } from "../config";
import type {
  AIProvider,
  ChatModelDefinition,
  EmbeddingModelDefinition,
} from "./types";

const CHAT_MODELS: ChatModelDefinition[] = [
  {
    id: "claude-opus-4-5",
    name: "Claude Opus 4.5",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.025,
  },
  {
    id: "claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    costPer1kInput: 0.001,
    costPer1kOutput: 0.005,
  },
];

export function createAnthropicProvider(): AIProvider {
  const config = getConfig();
  const providerConfig = config.providers.anthropic;

  const anthropic = createAnthropic({
    apiKey: providerConfig.apiKey,
    baseURL: providerConfig.baseURL,
  });

  return {
    id: "anthropic",
    name: "Anthropic",

    getChatModel(modelId: string): LanguageModel {
      return anthropic(modelId);
    },

    getEmbeddingModel(_modelId: string): EmbeddingModel {
      throw new Error(
        "Anthropic does not provide embedding models. Use OpenAI or Google for embeddings."
      );
    },

    listChatModels(): ChatModelDefinition[] {
      return CHAT_MODELS;
    },

    listEmbeddingModels(): EmbeddingModelDefinition[] {
      return [];
    },

    isConfigured(): boolean {
      return !!providerConfig.apiKey;
    },
  };
}
