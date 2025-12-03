import type { ProviderId } from "../config";

export type Embedding = number[];

export interface EmbeddingResult {
  embedding: Embedding;
  text: string;
  tokenCount: number;
}

export interface BatchEmbeddingResult {
  embeddings: Embedding[];
  texts: string[];
  totalTokens: number;
}

export interface TextChunk {
  id: string;
  text: string;
  index: number;
  startOffset: number;
  endOffset: number;
  tokenCount: number;
  metadata?: Record<string, unknown>;
}

export type ChunkingStrategy = "fixed" | "sentence" | "paragraph" | "recursive";

export interface ChunkingConfig {
  strategy: ChunkingStrategy;
  maxChunkSize: number;
  minChunkSize: number;
  chunkOverlap: number;
  separators: string[];
  preserveParagraphs: boolean;
}

export interface DocumentToEmbed {
  id: string;
  title?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface EmbeddedChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  embedding: Embedding;
  tokenCount: number;
  startOffset: number;
  endOffset: number;
  metadata?: Record<string, unknown>;
}

export interface EmbeddedDocument {
  documentId: string;
  title?: string;
  titleEmbedding?: Embedding;
  chunks: EmbeddedChunk[];
  totalTokens: number;
  processingTimeMs: number;
}

export interface EmbeddingOptions {
  providerId?: ProviderId;
  modelId?: string;
  chunking?: Partial<ChunkingConfig>;
  embedTitle?: boolean;
  skipIfTooLong?: boolean;
}

export interface SimilarityResult<T = unknown> {
  item: T;
  score: number;
  embedding: Embedding;
}
