/**
 * Embeddings Exports
 */

// Chunker
export {
  chunkDocument,
  DEFAULT_CHUNKING_CONFIG,
  DocumentChunker,
} from "./chunker";
// Service
export {
  EmbeddingService,
  embedDocument,
  embeddingService,
  embedQuery,
  embedText,
} from "./service";

// Types
export type {
  BatchEmbeddingResult,
  ChunkingConfig,
  ChunkingStrategy,
  DocumentToEmbed,
  EmbeddedChunk,
  EmbeddedDocument,
  Embedding,
  EmbeddingConfig,
  EmbeddingOptions,
  EmbeddingResult,
  SimilarityResult,
  TextChunk,
} from "./types";
