import type {
  ChatModelDefinition,
  EmbeddingModelDefinition,
  ProviderId,
} from "@openbeam/types/ai";
import { getChatModel as lookupChatModelDef } from "@openbeam/types/ai";
import type { EmbeddingModel, LanguageModel } from "ai";
import { getConfig } from "../config";
import { createAnthropicProvider } from "./anthropic";
import { createAzureProvider } from "./azure";
import { createGoogleProvider } from "./google";
import { createOllamaProvider } from "./ollama";
import { createOpenAIProvider } from "./openai";
import { createTwelveLabsProvider } from "./twelvelabs";
import type { AIProvider } from "./types";

export class ProviderRegistry {
  private readonly providers: Map<ProviderId, AIProvider> = new Map();
  private initialized = false;

  private ensureInitialized(): void {
    if (this.initialized) {
      return;
    }

    this.registerProvider(createOpenAIProvider());
    this.registerProvider(createAnthropicProvider());
    this.registerProvider(createGoogleProvider());
    this.registerProvider(createAzureProvider());
    this.registerProvider(createOllamaProvider());
    this.registerProvider(createTwelveLabsProvider());

    this.initialized = true;
  }

  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(providerId: ProviderId): AIProvider {
    this.ensureInitialized();

    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider "${providerId}" not found`);
    }
    return provider;
  }

  resolveProvider(providerId?: ProviderId, modelId?: string): ProviderId {
    if (providerId) {
      return providerId;
    }
    const config = getConfig();
    const effectiveModel = modelId || config.defaultChatModel;
    return (
      lookupChatModelDef(effectiveModel)?.provider || config.defaultProvider
    );
  }

  chatModel(providerId?: ProviderId, modelId?: string): LanguageModel {
    this.ensureInitialized();

    const config = getConfig();
    const effectiveModel = modelId || config.defaultChatModel;
    const effectiveProvider = this.resolveProvider(providerId, effectiveModel);

    const provider = this.getProvider(effectiveProvider);

    if (!provider.isConfigured()) {
      throw new Error(
        `Provider "${effectiveProvider}" is not configured. Please set the required API keys.`
      );
    }

    return provider.getChatModel(effectiveModel);
  }

  embeddingModel(providerId?: ProviderId, modelId?: string): EmbeddingModel {
    this.ensureInitialized();

    const config = getConfig();
    const effectiveProvider = providerId || "openai";
    const effectiveModel = modelId || config.defaultEmbeddingModel;

    const provider = this.getProvider(effectiveProvider);

    if (!provider.isConfigured()) {
      throw new Error(
        `Provider "${effectiveProvider}" is not configured. Please set the required API keys.`
      );
    }

    return provider.getEmbeddingModel(effectiveModel);
  }

  listChatModels(): ChatModelDefinition[] {
    this.ensureInitialized();

    const models: ChatModelDefinition[] = [];
    for (const provider of this.providers.values()) {
      if (provider.isConfigured()) {
        models.push(...provider.listChatModels());
      }
    }
    return models;
  }

  listEmbeddingModels(): EmbeddingModelDefinition[] {
    this.ensureInitialized();

    const models: EmbeddingModelDefinition[] = [];
    for (const provider of this.providers.values()) {
      if (provider.isConfigured()) {
        models.push(...provider.listEmbeddingModels());
      }
    }
    return models;
  }

  listProviders(): AIProvider[] {
    this.ensureInitialized();
    return Array.from(this.providers.values());
  }

  listConfiguredProviders(): AIProvider[] {
    this.ensureInitialized();
    return Array.from(this.providers.values()).filter((p) => p.isConfigured());
  }

  isProviderConfigured(providerId: ProviderId): boolean {
    this.ensureInitialized();
    const provider = this.providers.get(providerId);
    return provider?.isConfigured() ?? false;
  }

  getChatModelInfo(
    providerId: ProviderId,
    modelId: string
  ): ChatModelDefinition | undefined {
    this.ensureInitialized();
    const provider = this.providers.get(providerId);
    return provider?.listChatModels().find((m) => m.id === modelId);
  }

  getEmbeddingModelInfo(
    providerId: ProviderId,
    modelId: string
  ): EmbeddingModelDefinition | undefined {
    this.ensureInitialized();
    const provider = this.providers.get(providerId);
    return provider?.listEmbeddingModels().find((m) => m.id === modelId);
  }

  reset(): void {
    this.providers.clear();
    this.initialized = false;
  }
}

export const registry = new ProviderRegistry();

export const providerRegistry = registry;

export function createProviderRegistry(): ProviderRegistry {
  return new ProviderRegistry();
}

export function getLanguageModel(
  providerId?: ProviderId,
  modelId?: string
): LanguageModel {
  return registry.chatModel(providerId, modelId);
}

export function getEmbeddingModel(
  providerId?: ProviderId,
  modelId?: string
): EmbeddingModel {
  return registry.embeddingModel(providerId, modelId);
}

export function registerAllProviders(): void {
  registry.listProviders();
}
