/**
 * RAG Pipeline Types
 *
 * Type definitions for the Retrieval-Augmented Generation pipeline.
 */

import type { Citation, StreamChunk } from "../completion/types";
import type { Embedding } from "../embeddings/types";
import type { ProviderId } from "../providers/types";

/**
 * Retrieved document from Vespa
 */
export interface RetrievedDocument {
  id: string;
  title: string;
  content: string;
  url?: string;
  connectorType?: string;
  documentType?: string;
  authorName?: string;
  authorId?: string;
  createdAt?: number;
  updatedAt?: number;
  relevanceScore: number;
  embedding?: Embedding;
  metadata?: Record<string, unknown>;
}

/**
 * Retrieval options
 */
export interface RetrievalOptions {
  // Search parameters
  topK?: number;
  minScore?: number;

  // Filtering
  connectorTypes?: string[];
  connectorIds?: string[];
  documentTypes?: string[];
  authorIds?: string[];
  sourceIds?: string[];
  dateRange?: { from?: number; to?: number };

  // Access control
  accessControl?: string[];

  // Search mode
  searchMode?: "hybrid" | "semantic" | "keyword";

  // Reranking
  rerank?: boolean;
  rerankTopK?: number;
}

/**
 * Retrieval result
 */
export interface RetrievalResult {
  documents: RetrievedDocument[];
  query: string;
  embedding?: Embedding;
  searchTimeMs: number;
  totalMatches: number;
}

/**
 * RAG pipeline options
 */
export interface RAGOptions {
  // Model configuration
  provider?: ProviderId;
  model?: string;
  temperature?: number;
  maxTokens?: number;

  // Retrieval configuration
  retrieval?: RetrievalOptions;

  // Context configuration
  maxContextTokens?: number;
  includeMetadata?: boolean;

  // Response configuration
  systemPrompt?: string;
  includeCitations?: boolean;
  streamResponse?: boolean;

  // Access control
  accessControl?: string[];

  // Abort signal
  abortSignal?: AbortSignal;
}

/**
 * RAG answer result
 */
export interface RAGAnswer {
  answer: string;
  citations: Citation[];
  documents: RetrievedDocument[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  timing: {
    embeddingMs: number;
    retrievalMs: number;
    generationMs: number;
    totalMs: number;
  };
}

/**
 * Streaming RAG answer
 */
export interface RAGStreamChunk extends StreamChunk {
  citations?: Citation[];
  documents?: RetrievedDocument[];
}

/**
 * Context window configuration
 */
export interface ContextWindowConfig {
  maxTokens: number;
  reservedForOutput: number;
  reservedForPrompt: number;
  documentSeparator: string;
  truncationStrategy: "end" | "middle" | "smart";
}

/**
 * Context building result
 */
export interface BuiltContext {
  prompt: string;
  documents: RetrievedDocument[];
  tokenCount: number;
  truncated: boolean;
}

/**
 * Reranking options
 */
export interface RerankOptions {
  query: string;
  documents: RetrievedDocument[];
  topK: number;
  model?: string;
}

/**
 * Reranked document
 */
export interface RerankedDocument extends RetrievedDocument {
  rerankScore: number;
  originalRank: number;
}

/**
 * Query analysis result
 */
export interface QueryAnalysis {
  originalQuery: string;
  expandedQuery?: string;
  intent?: "question" | "search" | "command" | "clarification";
  entities?: string[];
  filters?: Record<string, string[]>;
  timeRange?: { from?: number; to?: number };
}

/**
 * RAG pipeline configuration
 */
export interface RAGPipelineConfig {
  // Embedding
  embeddingProvider: ProviderId;
  embeddingModel: string;

  // Completion
  completionProvider: ProviderId;
  completionModel: string;

  // Retrieval defaults
  defaultTopK: number;
  defaultMinScore: number;

  // Context window
  contextWindow: ContextWindowConfig;

  // Reranking
  enableReranking: boolean;
  rerankTopK: number;
}
