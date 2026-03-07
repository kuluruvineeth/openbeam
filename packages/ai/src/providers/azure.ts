import { createAzure } from "@ai-sdk/azure";
import type {
  ChatModelDefinition,
  EmbeddingModelDefinition,
} from "@openbeam/types/ai";
import type { EmbeddingModel, LanguageModel } from "ai";
import { getConfig } from "../config";
import type { AIProvider } from "./types";

const CHAT_MODELS: ChatModelDefinition[] = [
  {
    id: "gpt-5.2",
    name: "GPT-5.2 (Azure)",
    provider: "azure",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "gpt-5.2-pro",
    name: "GPT-5.2 Pro (Azure)",
    provider: "azure",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "gpt-5.1",
    name: "GPT-5.1 (Azure)",
    provider: "azure",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "o1",
    name: "o1 (Azure)",
    provider: "azure",
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "o3",
    name: "o3 (Azure)",
    provider: "azure",
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
];

const EMBEDDING_MODELS: EmbeddingModelDefinition[] = [
  {
    id: "text-embedding-3-small",
    name: "Text Embedding 3 Small (Azure)",
    provider: "azure",
    dimensions: 1536,
    maxTokens: 8191,
  },
  {
    id: "text-embedding-3-large",
    name: "Text Embedding 3 Large (Azure)",
    provider: "azure",
    dimensions: 3072,
    maxTokens: 8191,
  },
  {
    id: "text-embedding-ada-002",
    name: "Text Embedding Ada 002 (Azure)",
    provider: "azure",
    dimensions: 1536,
    maxTokens: 8191,
  },
];

export function createAzureProvider(): AIProvider {
  const config = getConfig();
  const providerConfig = config.providers.azure;

  const azure = createAzure({
    apiKey: providerConfig.apiKey,
    resourceName: providerConfig.resourceName,
    apiVersion: providerConfig.apiVersion,
  });

  return {
    id: "azure",
    name: "Azure OpenAI",

    getChatModel(modelId: string): LanguageModel {
      return azure(modelId);
    },

    getEmbeddingModel(modelId: string): EmbeddingModel {
      return azure.embedding(modelId);
    },

    listChatModels(): ChatModelDefinition[] {
      return CHAT_MODELS;
    },

    listEmbeddingModels(): EmbeddingModelDefinition[] {
      return EMBEDDING_MODELS;
    },

    isConfigured(): boolean {
      return !!(providerConfig.apiKey && providerConfig.resourceName);
    },
  };
}
