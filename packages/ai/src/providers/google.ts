import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { EmbeddingModel, LanguageModel } from "ai";
import { getConfig } from "../config";
import type {
  AIProvider,
  ChatModelDefinition,
  EmbeddingModelDefinition,
} from "./types";

const CHAT_MODELS: ChatModelDefinition[] = [
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro",
    provider: "google",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    costPer1kInput: 0.001_25,
    costPer1kOutput: 0.01,
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    costPer1kInput: 0.000_075,
    costPer1kOutput: 0.0003,
  },
  {
    id: "gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash Lite",
    provider: "google",
    contextWindow: 1_048_576,
    maxOutputTokens: 8192,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0004,
  },
];

const EMBEDDING_MODELS: EmbeddingModelDefinition[] = [
  {
    id: "text-embedding-004",
    name: "Text Embedding 004",
    provider: "google",
    dimensions: 768,
    maxTokens: 2048,
    costPer1kTokens: 0.000_025,
  },
  {
    id: "text-embedding-005",
    name: "Text Embedding 005",
    provider: "google",
    dimensions: 768,
    maxTokens: 2048,
    costPer1kTokens: 0.000_025,
  },
];

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

    getEmbeddingModel(modelId: string): EmbeddingModel<string> {
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
