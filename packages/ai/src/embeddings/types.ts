/**
 * Embedding Types
 *
 * Type definitions for the embedding service.
 */

import type { ProviderId } from "../providers/types";

/**
 * Embedding vector type (768 dimensions for Vespa compatibility)
 */
export type Embedding = number[];

/**
 * Embedding model configuration
 */
export interface EmbeddingConfig {
  provider: ProviderId;
  model: string;
  dimensions?: number;
  batchSize?: number;
}

/**
 * Result of embedding a single text
 */
export interface EmbeddingResult {
  embedding: Embedding;
  text: string;
  tokenCount: number;
}

/**
 * Result of batch embedding
 */
export interface BatchEmbeddingResult {
  embeddings: Embedding[];
  texts: string[];
  tokenCount: number;
}

/**
 * Chunk of text with metadata
 */
export interface TextChunk {
  id: string;
  text: string;
  index: number;
  startOffset: number;
  endOffset: number;
  metadata?: Record<string, unknown>;
}

/**
 * Chunking strategy options
 */
export type ChunkingStrategy =
  | "fixed" // Fixed character/token size
  | "sentence" // Sentence-based
  | "paragraph" // Paragraph-based
  | "semantic" // Semantic similarity-based
  | "recursive"; // Recursive character splitter

/**
 * Chunking configuration
 */
export interface ChunkingConfig {
  strategy: ChunkingStrategy;

  // Size limits
  maxChunkSize: number; // Max characters per chunk
  minChunkSize?: number; // Min characters per chunk
  chunkOverlap: number; // Overlap between chunks

  // For token-based chunking
  maxTokens?: number;

  // For semantic chunking
  semanticThreshold?: number;

  // Separators for recursive strategy (in order of preference)
  separators?: string[];

  // Whether to preserve paragraph structure
  preserveParagraphs?: boolean;
}

/**
 * Document to be chunked and embedded
 */
export interface DocumentToEmbed {
  id: string;
  title?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Embedded document chunk
 */
export interface EmbeddedChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  embedding: Embedding;
  tokenCount: number;
  metadata?: Record<string, unknown>;
}

/**
 * Result of embedding a full document
 */
export interface EmbeddedDocument {
  documentId: string;
  chunks: EmbeddedChunk[];
  totalTokens: number;
  processingTimeMs: number;
}

/**
 * Embedding service options
 */
export interface EmbeddingOptions {
  // Model override
  provider?: ProviderId;
  model?: string;

  // Chunking override
  chunking?: Partial<ChunkingConfig>;

  // Processing options
  skipIfTooLong?: boolean;
  maxRetries?: number;
}

/**
 * Similarity search result
 */
export interface SimilarityResult {
  id: string;
  text: string;
  score: number;
  embedding: Embedding;
  metadata?: Record<string, unknown>;
}
