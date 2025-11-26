/**
 * Azure OpenAI Provider
 *
 * Provider factory for Azure OpenAI Service deployments.
 * Supports GPT-4o, GPT-4 Turbo, and embedding models via Azure.
 */

import { createAzure } from "@ai-sdk/azure";
import type { EmbeddingModelV1, LanguageModelV1 } from "ai";
import { getConfig } from "../config";
import type { ModelInfo, ProviderFactory } from "./types";

/**
 * Azure OpenAI model catalog
 * Note: Actual available models depend on your Azure deployment
 */
const AZURE_MODELS: ModelInfo[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o (Azure)",
    provider: "azure",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini (Azure)",
    provider: "azure",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.000_165,
    costPer1kOutput: 0.000_66,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo (Azure)",
    provider: "azure",
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
  {
    id: "gpt-4",
    name: "GPT-4 (Azure)",
    provider: "azure",
    contextWindow: 8192,
    maxOutputTokens: 8192,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: false,
      json: true,
    },
    costPer1kInput: 0.03,
    costPer1kOutput: 0.06,
  },
  {
    id: "gpt-35-turbo",
    name: "GPT-3.5 Turbo (Azure)",
    provider: "azure",
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
  {
    id: "text-embedding-3-small",
    name: "Text Embedding 3 Small (Azure)",
    provider: "azure",
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
    name: "Text Embedding 3 Large (Azure)",
    provider: "azure",
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
    name: "Text Embedding Ada 002 (Azure)",
    provider: "azure",
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
 * Create an Azure OpenAI client instance
 */
function createClient() {
  const config = getConfig();

  if (!config.azure.resourceName) {
    throw new Error("Azure resource name is required");
  }

  return createAzure({
    apiKey: config.azure.apiKey,
    resourceName: config.azure.resourceName,
    apiVersion: config.azure.apiVersion || "2024-08-01-preview",
  });
}

/**
 * Azure Provider Factory
 */
export const azureProvider: ProviderFactory = {
  createChatModel(modelId: string): LanguageModelV1 {
    const client = createClient();
    const config = getConfig();
    // Use deployment name if provided, otherwise use model ID
    const deploymentName = config.azure.deploymentName || modelId;
    return client(deploymentName);
  },

  createEmbeddingModel(modelId: string): EmbeddingModelV1<string> {
    const client = createClient();
    return client.textEmbeddingModel(modelId);
  },

  getAvailableModels(): ModelInfo[] {
    return AZURE_MODELS;
  },

  isConfigured(): boolean {
    const config = getConfig();
    return !!(config.azure.apiKey && config.azure.resourceName);
  },
};

export default azureProvider;
