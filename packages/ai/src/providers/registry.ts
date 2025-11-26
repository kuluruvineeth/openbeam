/**
 * Provider Registry
 *
 * Central registry for all AI model providers.
 * Enables model-agnostic switching with a single line change.
 *
 * @example
 * // Get a chat model
 * const model = registry.getChatModel("openai", "gpt-4o");
 *
 * // Get an embedding model
 * const embedder = registry.getEmbeddingModel("openai", "text-embedding-3-small");
 *
 * // List all available models
 * const models = registry.getAllModels();
 */

import type { EmbeddingModelV1, LanguageModelV1 } from "ai";
import { getConfig } from "../config";
import { anthropicProvider } from "./anthropic";
import { azureProvider } from "./azure";
import { googleProvider } from "./google";
import { ollamaProvider } from "./ollama";
import { openaiProvider } from "./openai";
import type {
  ModelInfo,
  ProviderFactory,
  ProviderId,
  ProviderRegistry,
} from "./types";

/**
 * Provider factory registry
 * Add new providers here - that's all it takes!
 */
const providers: Record<ProviderId, ProviderFactory> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  google: googleProvider,
  ollama: ollamaProvider,
  azure: azureProvider,
};

/**
 * Provider Registry Implementation
 */
class ProviderRegistryImpl implements ProviderRegistry {
  /**
   * Get a provider factory by ID
   */
  getProvider(id: ProviderId): ProviderFactory {
    const provider = providers[id];
    if (!provider) {
      throw new Error(
        `Unknown provider: ${id}. Available: ${Object.keys(providers).join(", ")}`
      );
    }
    return provider;
  }

  /**
   * Get a chat model from any provider
   */
  getChatModel(provider: ProviderId, modelId: string): LanguageModelV1 {
    return this.getProvider(provider).createChatModel(modelId);
  }

  /**
   * Get an embedding model from any provider
   */
  getEmbeddingModel(
    provider: ProviderId,
    modelId: string
  ): EmbeddingModelV1<string> {
    return this.getProvider(provider).createEmbeddingModel(modelId);
  }

  /**
   * List all configured providers (those with valid credentials)
   */
  getConfiguredProviders(): ProviderId[] {
    return (Object.keys(providers) as ProviderId[]).filter((id) =>
      providers[id].isConfigured()
    );
  }

  /**
   * List all available models across all providers
   */
  getAllModels(): ModelInfo[] {
    return (Object.keys(providers) as ProviderId[]).flatMap((id) =>
      providers[id].getAvailableModels()
    );
  }

  /**
   * List models from configured providers only
   */
  getConfiguredModels(): ModelInfo[] {
    return this.getConfiguredProviders().flatMap((id) =>
      providers[id].getAvailableModels()
    );
  }

  /**
   * Get chat models only
   */
  getChatModels(): ModelInfo[] {
    return this.getAllModels().filter((m) => !m.capabilities.embedding);
  }

  /**
   * Get embedding models only
   */
  getEmbeddingModels(): ModelInfo[] {
    return this.getAllModels().filter((m) => m.capabilities.embedding);
  }

  /**
   * Find a model by ID across all providers
   */
  findModel(modelId: string): ModelInfo | undefined {
    return this.getAllModels().find((m) => m.id === modelId);
  }

  /**
   * Get the default chat model based on configuration
   */
  getDefaultChatModel(): LanguageModelV1 {
    const config = getConfig();
    return this.getChatModel(config.defaultProvider, config.defaultChatModel);
  }

  /**
   * Get the default embedding model based on configuration
   */
  getDefaultEmbeddingModel(): EmbeddingModelV1<string> {
    const config = getConfig();
    // Always use OpenAI for embeddings by default (best quality for RAG)
    return this.getEmbeddingModel("openai", config.defaultEmbeddingModel);
  }
}

/**
 * Singleton registry instance
 */
export const registry = new ProviderRegistryImpl();

/**
 * Convenience functions for direct access
 */
export function getChatModel(
  provider: ProviderId,
  modelId: string
): LanguageModelV1 {
  return registry.getChatModel(provider, modelId);
}

export function getEmbeddingModel(
  provider: ProviderId,
  modelId: string
): EmbeddingModelV1<string> {
  return registry.getEmbeddingModel(provider, modelId);
}

export function getDefaultChatModel(): LanguageModelV1 {
  return registry.getDefaultChatModel();
}

export function getDefaultEmbeddingModel(): EmbeddingModelV1<string> {
  return registry.getDefaultEmbeddingModel();
}

export default registry;
