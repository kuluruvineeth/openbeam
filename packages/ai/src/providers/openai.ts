/**
 * OpenAI Provider
 *
 * Provider factory for OpenAI models including GPT-4o, GPT-4.1, o1, and embeddings.
 * Uses AI SDK's OpenAI provider for type-safe model access.
 */

import { createOpenAI } from "@ai-sdk/openai";
import type { EmbeddingModelV1, LanguageModelV1 } from "ai";
import { getConfig } from "../config";
import type { ModelInfo, ProviderFactory } from "./types";

/**
 * OpenAI model catalog with latest models and accurate metadata
 * Updated: November 2025
 */
const OPENAI_MODELS: ModelInfo[] = [
  // === GPT-4.1 Series (Latest flagship) ===
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "openai",
    contextWindow: 1_000_000,
    maxOutputTokens: 32_768,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.002,
    costPer1kOutput: 0.008,
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "openai",
    contextWindow: 1_000_000,
    maxOutputTokens: 32_768,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.0004,
    costPer1kOutput: 0.0016,
  },
  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    provider: "openai",
    contextWindow: 1_000_000,
    maxOutputTokens: 32_768,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0004,
  },
  // === GPT-4o Series (Omni) ===
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
  },
  {
    id: "gpt-4o-2024-11-20",
    name: "GPT-4o (Nov 2024)",
    provider: "openai",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.000_15,
    costPer1kOutput: 0.0006,
  },
  // === O1 Series (Reasoning) ===
  {
    id: "o1",
    name: "O1",
    provider: "openai",
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.015,
    costPer1kOutput: 0.06,
  },
  {
    id: "o1-mini",
    name: "O1 Mini",
    provider: "openai",
    contextWindow: 128_000,
    maxOutputTokens: 65_536,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: false,
      json: true,
    },
    costPer1kInput: 0.003,
    costPer1kOutput: 0.012,
  },
  {
    id: "o1-preview",
    name: "O1 Preview",
    provider: "openai",
    contextWindow: 128_000,
    maxOutputTokens: 32_768,
    capabilities: {
      streaming: false,
      toolCalling: false,
      vision: false,
      json: true,
    },
    costPer1kInput: 0.015,
    costPer1kOutput: 0.06,
  },
  // === O3 Series (Latest reasoning) ===
  {
    id: "o3-mini",
    name: "O3 Mini",
    provider: "openai",
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: false,
      json: true,
    },
    costPer1kInput: 0.0011,
    costPer1kOutput: 0.0044,
  },
  // === GPT-4 Turbo ===
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openai",
    contextWindow: 128_000,
    maxOutputTokens: 4096,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
  },
  // === GPT-3.5 Turbo ===
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    contextWindow: 16_385,
    maxOutputTokens: 4096,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: false,
      json: true,
    },
    costPer1kInput: 0.0005,
    costPer1kOutput: 0.0015,
  },
  // === Embedding Models ===
  {
    id: "text-embedding-3-small",
    name: "Text Embedding 3 Small",
    provider: "openai",
    contextWindow: 8191,
    maxOutputTokens: 0,
    capabilities: {
      streaming: false,
      toolCalling: false,
      vision: false,
      json: false,
      embedding: true,
    },
    costPer1kInput: 0.000_02,
  },
  {
    id: "text-embedding-3-large",
    name: "Text Embedding 3 Large",
    provider: "openai",
    contextWindow: 8191,
    maxOutputTokens: 0,
    capabilities: {
      streaming: false,
      toolCalling: false,
      vision: false,
      json: false,
      embedding: true,
    },
    costPer1kInput: 0.000_13,
  },
  {
    id: "text-embedding-ada-002",
    name: "Text Embedding Ada 002",
    provider: "openai",
    contextWindow: 8191,
    maxOutputTokens: 0,
    capabilities: {
      streaming: false,
      toolCalling: false,
      vision: false,
      json: false,
      embedding: true,
    },
    costPer1kInput: 0.0001,
  },
];

/**
 * Create an OpenAI client instance
 */
function createClient() {
  const config = getConfig();
  return createOpenAI({
    apiKey: config.openai.apiKey,
    organization: config.openai.organization,
    baseURL: config.openai.baseURL,
  });
}

/**
 * OpenAI Provider Factory
 */
export const openaiProvider: ProviderFactory = {
  createChatModel(modelId: string): LanguageModelV1 {
    const client = createClient();
    return client(modelId);
  },

  createEmbeddingModel(modelId: string): EmbeddingModelV1<string> {
    const client = createClient();
    return client.textEmbeddingModel(modelId);
  },

  getAvailableModels(): ModelInfo[] {
    return OPENAI_MODELS;
  },

  isConfigured(): boolean {
    const config = getConfig();
    return !!config.openai.apiKey;
  },
};

export default openaiProvider;
