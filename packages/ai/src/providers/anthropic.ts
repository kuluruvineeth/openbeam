import { createAnthropic } from "@ai-sdk/anthropic";
import type {
  ChatModelDefinition,
  EmbeddingModelDefinition,
} from "@openbeam/types/ai";
import { getChatModelsByProvider } from "@openbeam/types/ai";
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

const CHAT_MODELS: ChatModelDefinition[] = getChatModelsByProvider(
  "anthropic"
).map(toChatModelDefinition);

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
