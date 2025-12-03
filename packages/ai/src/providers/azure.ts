import { createAzure } from "@ai-sdk/azure";
import type { EmbeddingModel, LanguageModel } from "ai";
import { getConfig } from "../config";
import type {
  AIProvider,
  ChatModelDefinition,
  EmbeddingModelDefinition,
} from "./types";

const CHAT_MODELS: ChatModelDefinition[] = [
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
    id: "gpt-5.1-chat",
    name: "GPT-5.1 Chat (Azure)",
    provider: "azure",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "gpt-5.1-codex",
    name: "GPT-5.1 Codex (Azure)",
    provider: "azure",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "gpt-5",
    name: "GPT-5 (Azure)",
    provider: "azure",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "gpt-5-chat",
    name: "GPT-5 Chat (Azure)",
    provider: "azure",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini (Azure)",
    provider: "azure",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "gpt-5-nano",
    name: "GPT-5 Nano (Azure)",
    provider: "azure",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "gpt-4.5-preview",
    name: "GPT-4.5 Preview (Azure)",
    provider: "azure",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1 (Azure)",
    provider: "azure",
    contextWindow: 1_000_000,
    maxOutputTokens: 32_768,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini (Azure)",
    provider: "azure",
    contextWindow: 1_000_000,
    maxOutputTokens: 32_768,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano (Azure)",
    provider: "azure",
    contextWindow: 1_000_000,
    maxOutputTokens: 32_768,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o (Azure)",
    provider: "azure",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini (Azure)",
    provider: "azure",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "o4-mini",
    name: "o4 Mini (Azure)",
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
  {
    id: "o3-mini",
    name: "o3 Mini (Azure)",
    provider: "azure",
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    supportsTools: true,
    supportsVision: false,
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
    id: "codex-mini",
    name: "Codex Mini (Azure)",
    provider: "azure",
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "DeepSeek-V3.1",
    name: "DeepSeek V3.1 (Azure)",
    provider: "azure",
    contextWindow: 128_000,
    maxOutputTokens: 8192,
    supportsTools: true,
    supportsVision: false,
    supportsStreaming: true,
  },
  {
    id: "DeepSeek-R1-0528",
    name: "DeepSeek R1 (Azure)",
    provider: "azure",
    contextWindow: 128_000,
    maxOutputTokens: 8192,
    supportsTools: true,
    supportsVision: false,
    supportsStreaming: true,
  },
  {
    id: "Llama-4-Maverick-17B-128E-Instruct-FP8",
    name: "Llama 4 Maverick 17B (Azure)",
    provider: "azure",
    contextWindow: 128_000,
    maxOutputTokens: 8192,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "Llama-3.3-70B-Instruct",
    name: "Llama 3.3 70B Instruct (Azure)",
    provider: "azure",
    contextWindow: 128_000,
    maxOutputTokens: 8192,
    supportsTools: true,
    supportsVision: false,
    supportsStreaming: true,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo (Azure)",
    provider: "azure",
    contextWindow: 128_000,
    maxOutputTokens: 4096,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "gpt-35-turbo",
    name: "GPT-3.5 Turbo (Azure)",
    provider: "azure",
    contextWindow: 16_385,
    maxOutputTokens: 4096,
    supportsTools: true,
    supportsVision: false,
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

    getEmbeddingModel(modelId: string): EmbeddingModel<string> {
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
