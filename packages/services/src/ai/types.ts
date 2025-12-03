import type { Embedding } from "@openplane/ai";
import type { GenericDocument } from "@openplane/vespa";

export interface HybridSearchParams {
  query: string;
  teamId: string;
  queryEmbedding?: Embedding;
  limit?: number;
  offset?: number;
  bm25Weight?: number;
  vectorWeight?: number;
  minScore?: number;
  connectorTypes?: string[];
  documentTypes?: string[];
  accessControlIds?: string[];
}

export interface HybridSearchResult {
  documents: ScoredDocument[];
  total: number;
  queryTime: number;
  embeddingTime?: number;
}

export interface ScoredDocument extends GenericDocument {
  relevanceScore: number;
  bm25Score?: number;
  vectorScore?: number;
}

export interface RAGContextParams {
  query: string;
  teamId: string;
  maxTokens?: number;
  topK?: number;
  minScore?: number;
  accessControlIds?: string[];
  includeMetadata?: boolean;
}

export interface RAGContext {
  documents: ContextDocument[];
  totalTokens: number;
  truncated: boolean;
  retrievalTime: number;
}

export interface ContextDocument {
  id: string;
  title: string;
  content: string;
  url?: string;
  source?: string;
  connectorType?: string;
  relevanceScore: number;
  tokenCount: number;
}

export interface RAGAnswerParams extends RAGContextParams {
  systemPrompt?: string;
  modelId?: string;
  temperature?: number;
  stream?: boolean;
}

export interface RAGAnswer {
  answer: string;
  citations: Citation[];
  context: RAGContext;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

export interface Citation {
  documentId: string;
  title: string;
  url?: string;
  snippet: string;
  relevanceScore: number;
}

export interface CachedEmbedding {
  embedding: Embedding;
  text: string;
  modelId: string;
  createdAt: number;
}

export interface RerankParams {
  query: string;
  documents: ScoredDocument[];
  topK?: number;
}

export interface RerankResult {
  documents: ScoredDocument[];
  rerankTime: number;
}
