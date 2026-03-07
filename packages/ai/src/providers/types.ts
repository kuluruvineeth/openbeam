import type {
  ChatModelDefinition,
  EmbeddingModelDefinition,
  ProviderId,
} from "@openbeam/types/ai";
import type { EmbeddingModel, LanguageModel } from "ai";

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
