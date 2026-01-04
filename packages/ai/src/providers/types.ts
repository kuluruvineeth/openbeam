import type { EmbeddingModel, LanguageModel } from "ai";

export type ProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "azure"
  | "ollama"
  | "twelvelabs";

export interface ChatModelDefinition {
  id: string;
  name: string;
  provider: ProviderId;
  contextWindow: number;
  maxOutputTokens: number;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  costPer1kInput?: number;
  costPer1kOutput?: number;
}

export interface EmbeddingModelDefinition {
  id: string;
  name: string;
  provider: ProviderId;
  dimensions: number;
  maxTokens: number;
  costPer1kTokens?: number;
}

export interface AIProvider {
  id: ProviderId;
  name: string;
  getChatModel(modelId: string): LanguageModel;
  getEmbeddingModel(modelId: string): EmbeddingModel;
  listChatModels(): ChatModelDefinition[];
  listEmbeddingModels(): EmbeddingModelDefinition[];
  isConfigured(): boolean;
}

export interface RegistryState {
  providers: Map<ProviderId, AIProvider>;
  defaultProvider: ProviderId;
  defaultChatModel: string;
  defaultEmbeddingModel: string;
}
