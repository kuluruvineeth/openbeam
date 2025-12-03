import { createOpenAI } from "@ai-sdk/openai";
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
    name: "GPT-5.1",
    provider: "openai",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    costPer1kInput: 0.001_25,
    costPer1kOutput: 0.01,
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    provider: "openai",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    costPer1kInput: 0.001_25,
    costPer1kOutput: 0.01,
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "openai",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    costPer1kInput: 0.000_25,
    costPer1kOutput: 0.002,
  },
  {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "openai",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    costPer1kInput: 0.000_05,
    costPer1kOutput: 0.0004,
  },
];

const EMBEDDING_MODELS: EmbeddingModelDefinition[] = [
  {
    id: "text-embedding-3-small",
    name: "Text Embedding 3 Small",
    provider: "openai",
    dimensions: 1536,
    maxTokens: 8191,
    costPer1kTokens: 0.000_02,
  },
  {
    id: "text-embedding-3-large",
    name: "Text Embedding 3 Large",
    provider: "openai",
    dimensions: 3072,
    maxTokens: 8191,
    costPer1kTokens: 0.000_13,
  },
  {
    id: "text-embedding-ada-002",
    name: "Text Embedding Ada 002",
    provider: "openai",
    dimensions: 1536,
    maxTokens: 8191,
    costPer1kTokens: 0.0001,
  },
];

export function createOpenAIProvider(): AIProvider {
  const config = getConfig();
  const providerConfig = config.providers.openai;

  const openai = createOpenAI({
    apiKey: providerConfig.apiKey,
    organization: providerConfig.organization,
    baseURL: providerConfig.baseURL,
  });

  return {
    id: "openai",
    name: "OpenAI",

    getChatModel(modelId: string): LanguageModel {
      return openai(modelId);
    },

    getEmbeddingModel(modelId: string): EmbeddingModel<string> {
      return openai.embedding(modelId);
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
