import type {
  ConversationTurn,
  ExtractedEntity,
  RAGChunk,
  RAGChunkingOptions,
  RAGCitation,
  RAGCitationSimple,
  RAGConfig,
  RerankingOptions,
} from "@openbeam/types/ai";

export type Citation = RAGCitationSimple;

export interface ConversationContext {
  conversationId: string;
  turns: ConversationTurn[];
  summary: string | null;
  entities: Map<string, ExtractedEntity>;
  topicShift: boolean;
}

export interface RAGContext {
  systemPrompt: string;
  contextText: string;
  chunks: RAGChunk[];
  totalTokens: number;
  truncated: boolean;
  citationMap: Map<string, RAGCitation>;
}

export const DEFAULT_RAG_CONFIG: RAGConfig = {
  maxChunks: 20,
  maxContextTokens: 8000,
  reserveAnswerTokens: 2000,
  diversityWeight: 0.3,
  groundingThreshold: 0.5,
  includeMetadata: true,
  citationStyle: "inline",
};

export const DEFAULT_CHUNKING_OPTIONS: RAGChunkingOptions = {
  maxChunkSize: 512,
  chunkOverlap: 50,
  minChunkSize: 100,
  splitOn: "sentence",
};

export const DEFAULT_RERANKING_OPTIONS: RerankingOptions = {
  topK: 10,
  diversityWeight: 0.3,
  minScore: 0.1,
};
