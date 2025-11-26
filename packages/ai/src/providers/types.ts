/**
 * Provider Types
 *
 * Type definitions for the model provider registry system.
 * These types enable type-safe model switching across providers.
 */

import type { EmbeddingModelV1, LanguageModelV1 } from "ai";

/**
 * Supported provider identifiers
 */
export type ProviderId = "openai" | "anthropic" | "google" | "ollama" | "azure";

/**
 * Model capability flags
 */
export interface ModelCapabilities {
  streaming: boolean;
  toolCalling: boolean;
  vision: boolean;
  json: boolean;
  embedding?: boolean;
}

/**
 * Model metadata for display and selection
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderId;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: ModelCapabilities;
  costPer1kInput?: number;
  costPer1kOutput?: number;
}

/**
 * Chat model configuration
 */
export interface ChatModelConfig {
  provider: ProviderId;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
}

/**
 * Embedding model configuration
 */
export interface EmbeddingModelConfig {
  provider: ProviderId;
  model: string;
  dimensions?: number;
}

/**
 * Provider factory interface
 */
export interface ProviderFactory {
  /**
   * Create a language model instance
   */
  createChatModel(modelId: string): LanguageModelV1;

  /**
   * Create an embedding model instance
   */
  createEmbeddingModel(modelId: string): EmbeddingModelV1<string>;

  /**
   * Get available models for this provider
   */
  getAvailableModels(): ModelInfo[];

  /**
   * Check if provider is configured (has required credentials)
   */
  isConfigured(): boolean;
}

/**
 * Provider registry interface
 */
export interface ProviderRegistry {
  /**
   * Get a provider factory by ID
   */
  getProvider(id: ProviderId): ProviderFactory;

  /**
   * Get a chat model from any provider
   */
  getChatModel(provider: ProviderId, modelId: string): LanguageModelV1;

  /**
   * Get an embedding model from any provider
   */
  getEmbeddingModel(
    provider: ProviderId,
    modelId: string
  ): EmbeddingModelV1<string>;

  /**
   * List all configured providers
   */
  getConfiguredProviders(): ProviderId[];

  /**
   * List all available models across providers
   */
  getAllModels(): ModelInfo[];
}

/**
 * Common model identifiers for convenience
 */
export const MODELS = {
  // OpenAI
  GPT_4O: { provider: "openai" as const, model: "gpt-4o" },
  GPT_4O_MINI: { provider: "openai" as const, model: "gpt-4o-mini" },
  GPT_4_TURBO: { provider: "openai" as const, model: "gpt-4-turbo" },
  GPT_4: { provider: "openai" as const, model: "gpt-4" },
  GPT_35_TURBO: { provider: "openai" as const, model: "gpt-3.5-turbo" },

  // OpenAI Embeddings
  TEXT_EMBEDDING_3_SMALL: {
    provider: "openai" as const,
    model: "text-embedding-3-small",
  },
  TEXT_EMBEDDING_3_LARGE: {
    provider: "openai" as const,
    model: "text-embedding-3-large",
  },
  TEXT_EMBEDDING_ADA_002: {
    provider: "openai" as const,
    model: "text-embedding-ada-002",
  },

  // Anthropic
  CLAUDE_4_OPUS: {
    provider: "anthropic" as const,
    model: "claude-sonnet-4-20250514",
  },
  CLAUDE_4_SONNET: {
    provider: "anthropic" as const,
    model: "claude-sonnet-4-20250514",
  },
  CLAUDE_35_SONNET: {
    provider: "anthropic" as const,
    model: "claude-3-5-sonnet-20241022",
  },
  CLAUDE_35_HAIKU: {
    provider: "anthropic" as const,
    model: "claude-3-5-haiku-20241022",
  },

  // Google
  GEMINI_2_FLASH: {
    provider: "google" as const,
    model: "gemini-2.0-flash-exp",
  },
  GEMINI_15_PRO: { provider: "google" as const, model: "gemini-1.5-pro" },
  GEMINI_15_FLASH: { provider: "google" as const, model: "gemini-1.5-flash" },

  // Ollama (local)
  LLAMA_32: { provider: "ollama" as const, model: "llama3.2" },
  MISTRAL: { provider: "ollama" as const, model: "mistral" },
  NOMIC_EMBED: { provider: "ollama" as const, model: "nomic-embed-text" },
} as const;
