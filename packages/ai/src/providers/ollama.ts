/**
 * Ollama Provider
 *
 * Provider factory for local Ollama models.
 * Uses OpenAI-compatible API endpoint.
 */

import { createOpenAI } from "@ai-sdk/openai";
import type { EmbeddingModelV1, LanguageModelV1 } from "ai";
import { getConfig } from "../config";
import type { ModelInfo, ProviderFactory } from "./types";

/**
 * Common Ollama models (user can run any model locally)
 */
const OLLAMA_MODELS: ModelInfo[] = [
  {
    id: "llama3.2",
    name: "Llama 3.2",
    provider: "ollama",
    contextWindow: 128_000,
    maxOutputTokens: 4096,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: false,
      json: true,
    },
  },
  {
    id: "llama3.2:1b",
    name: "Llama 3.2 1B",
    provider: "ollama",
    contextWindow: 128_000,
    maxOutputTokens: 4096,
    capabilities: {
      streaming: true,
      toolCalling: false,
      vision: false,
      json: true,
    },
  },
  {
    id: "llama3.1",
    name: "Llama 3.1",
    provider: "ollama",
    contextWindow: 128_000,
    maxOutputTokens: 4096,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: false,
      json: true,
    },
  },
  {
    id: "llama3.1:70b",
    name: "Llama 3.1 70B",
    provider: "ollama",
    contextWindow: 128_000,
    maxOutputTokens: 4096,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: false,
      json: true,
    },
  },
  {
    id: "mistral",
    name: "Mistral 7B",
    provider: "ollama",
    contextWindow: 32_768,
    maxOutputTokens: 4096,
    capabilities: {
      streaming: true,
      toolCalling: false,
      vision: false,
      json: true,
    },
  },
  {
    id: "mixtral",
    name: "Mixtral 8x7B",
    provider: "ollama",
    contextWindow: 32_768,
    maxOutputTokens: 4096,
    capabilities: {
      streaming: true,
      toolCalling: false,
      vision: false,
      json: true,
    },
  },
  {
    id: "codellama",
    name: "Code Llama",
    provider: "ollama",
    contextWindow: 16_384,
    maxOutputTokens: 4096,
    capabilities: {
      streaming: true,
      toolCalling: false,
      vision: false,
      json: true,
    },
  },
  {
    id: "qwen2.5",
    name: "Qwen 2.5",
    provider: "ollama",
    contextWindow: 32_768,
    maxOutputTokens: 4096,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: false,
      json: true,
    },
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    provider: "ollama",
    contextWindow: 65_536,
    maxOutputTokens: 8192,
    capabilities: {
      streaming: true,
      toolCalling: false,
      vision: false,
      json: true,
    },
  },
  // Embedding models
  {
    id: "nomic-embed-text",
    name: "Nomic Embed Text",
    provider: "ollama",
    contextWindow: 8192,
    maxOutputTokens: 0,
    capabilities: {
      streaming: false,
      toolCalling: false,
      vision: false,
      json: false,
      embedding: true,
    },
  },
  {
    id: "mxbai-embed-large",
    name: "MXBai Embed Large",
    provider: "ollama",
    contextWindow: 512,
    maxOutputTokens: 0,
    capabilities: {
      streaming: false,
      toolCalling: false,
      vision: false,
      json: false,
      embedding: true,
    },
  },
  {
    id: "all-minilm",
    name: "All MiniLM",
    provider: "ollama",
    contextWindow: 256,
    maxOutputTokens: 0,
    capabilities: {
      streaming: false,
      toolCalling: false,
      vision: false,
      json: false,
      embedding: true,
    },
  },
];

/**
 * Create an Ollama client instance (OpenAI-compatible)
 */
function createClient() {
  const config = getConfig();
  return createOpenAI({
    baseURL: config.ollama.baseURL,
    apiKey: "ollama", // Ollama doesn't require API key but SDK needs one
  });
}

/**
 * Ollama Provider Factory
 */
export const ollamaProvider: ProviderFactory = {
  createChatModel(modelId: string): LanguageModelV1 {
    const client = createClient();
    return client(modelId);
  },

  createEmbeddingModel(modelId: string): EmbeddingModelV1<string> {
    const client = createClient();
    return client.textEmbeddingModel(modelId);
  },

  getAvailableModels(): ModelInfo[] {
    return OLLAMA_MODELS;
  },

  isConfigured(): boolean {
    // Ollama is always "configured" if running locally
    // Could add health check here
    return true;
  },
};

export default ollamaProvider;
