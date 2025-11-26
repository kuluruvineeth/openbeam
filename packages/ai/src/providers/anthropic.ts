/**
 * Anthropic Provider
 *
 * Provider factory for Anthropic Claude models.
 * Includes Claude 4, Claude 3.5, and Claude 3 series.
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import type { EmbeddingModelV1, LanguageModelV1 } from "ai";
import { getConfig } from "../config";
import type { ModelInfo, ProviderFactory } from "./types";

/**
 * Anthropic model catalog with latest models
 * Updated: November 2025
 */
const ANTHROPIC_MODELS: ModelInfo[] = [
  // === Claude 4 Series (Latest) ===
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  {
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 32_000,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
  },
  // === Claude 3.7 Series ===
  {
    id: "claude-3-7-sonnet-20250219",
    name: "Claude 3.7 Sonnet",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  // === Claude 3.5 Series ===
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet v2",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 8192,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  {
    id: "claude-3-5-sonnet-20240620",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 8192,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 8192,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.001,
    costPer1kOutput: 0.005,
  },
  // === Claude 3 Series ===
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 4096,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
  },
  {
    id: "claude-3-sonnet-20240229",
    name: "Claude 3 Sonnet",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 4096,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  {
    id: "claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 4096,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.000_25,
    costPer1kOutput: 0.001_25,
  },
];

/**
 * Create an Anthropic client instance
 */
function createClient() {
  const config = getConfig();
  return createAnthropic({
    apiKey: config.anthropic.apiKey,
    baseURL: config.anthropic.baseURL,
  });
}

/**
 * Anthropic Provider Factory
 */
export const anthropicProvider: ProviderFactory = {
  createChatModel(modelId: string): LanguageModelV1 {
    const client = createClient();
    return client(modelId);
  },

  createEmbeddingModel(_modelId: string): EmbeddingModelV1<string> {
    // Anthropic doesn't provide embedding models
    // Use OpenAI or other providers for embeddings
    throw new Error(
      "Anthropic does not provide embedding models. Use OpenAI or Google for embeddings."
    );
  },

  getAvailableModels(): ModelInfo[] {
    return ANTHROPIC_MODELS;
  },

  isConfigured(): boolean {
    const config = getConfig();
    return !!config.anthropic.apiKey;
  },
};

export default anthropicProvider;
