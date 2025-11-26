/**
 * Embedding Service
 *
 * Provides document embedding with support for:
 * - Multiple embedding models (OpenAI, Google, Ollama)
 * - Automatic chunking for long documents
 * - Batch processing for efficiency
 * - 768-dimension embeddings compatible with Vespa
 */

import { embed, embedMany } from "ai";
import { getConfig } from "../config";
import { registry } from "../providers";
import type { ProviderId } from "../providers/types";
import { DEFAULT_CHUNKING_CONFIG, DocumentChunker } from "./chunker";
import type {
  BatchEmbeddingResult,
  ChunkingConfig,
  DocumentToEmbed,
  EmbeddedChunk,
  EmbeddedDocument,
  Embedding,
  EmbeddingOptions,
  EmbeddingResult,
} from "./types";

/**
 * Embedding Service class
 */
export class EmbeddingService {
  private provider: ProviderId;
  private modelId: string;
  private chunker: DocumentChunker;
  private batchSize: number;

  constructor(
    options: {
      provider?: ProviderId;
      model?: string;
      chunking?: Partial<ChunkingConfig>;
      batchSize?: number;
    } = {}
  ) {
    const config = getConfig();

    this.provider = options.provider || "openai";
    this.modelId = options.model || config.defaultEmbeddingModel;
    this.chunker = new DocumentChunker(options.chunking);
    this.batchSize = options.batchSize || 100;
  }

  /**
   * Get the embedding model instance
   */
  private getModel() {
    return registry.getEmbeddingModel(this.provider, this.modelId);
  }

  /**
   * Embed a single text string
   */
  async embed(text: string): Promise<EmbeddingResult> {
    const startTime = Date.now();

    const { embedding, usage } = await embed({
      model: this.getModel(),
      value: text,
    });

    return {
      embedding,
      text,
      tokenCount: usage?.tokens || DocumentChunker.estimateTokens(text),
    };
  }

  /**
   * Embed multiple texts in batch
   */
  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    if (texts.length === 0) {
      return { embeddings: [], texts: [], tokenCount: 0 };
    }

    // Process in batches
    const allEmbeddings: Embedding[] = [];
    let totalTokens = 0;

    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);

      const { embeddings, usage } = await embedMany({
        model: this.getModel(),
        values: batch,
      });

      allEmbeddings.push(...embeddings);
      totalTokens +=
        usage?.tokens ||
        batch.reduce((sum, t) => sum + DocumentChunker.estimateTokens(t), 0);
    }

    return {
      embeddings: allEmbeddings,
      texts,
      tokenCount: totalTokens,
    };
  }

  /**
   * Embed a document with automatic chunking
   */
  async embedDocument(
    document: DocumentToEmbed,
    options: EmbeddingOptions = {}
  ): Promise<EmbeddedDocument> {
    const startTime = Date.now();

    // Use custom chunking if provided
    const chunker = options.chunking
      ? new DocumentChunker({ ...DEFAULT_CHUNKING_CONFIG, ...options.chunking })
      : this.chunker;

    // Chunk the document
    const chunks = chunker.chunk(document.content, document.id);

    if (chunks.length === 0) {
      return {
        documentId: document.id,
        chunks: [],
        totalTokens: 0,
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Extract texts for batch embedding
    const texts = chunks.map((c) => c.text);

    // Optionally prepend title to first chunk for better context
    if (document.title && texts.length > 0) {
      texts[0] = `${document.title}\n\n${texts[0]}`;
    }

    // Embed all chunks in batch
    const { embeddings, tokenCount } = await this.embedBatch(texts);

    // Build embedded chunks
    const embeddedChunks: EmbeddedChunk[] = chunks.map((chunk, index) => ({
      id: chunk.id,
      documentId: document.id,
      chunkIndex: index,
      text: chunk.text,
      embedding: embeddings[index],
      tokenCount: DocumentChunker.estimateTokens(chunk.text),
      metadata: {
        ...document.metadata,
        ...chunk.metadata,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
      },
    }));

    return {
      documentId: document.id,
      chunks: embeddedChunks,
      totalTokens: tokenCount,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Embed multiple documents
   */
  async embedDocuments(
    documents: DocumentToEmbed[],
    options: EmbeddingOptions = {}
  ): Promise<EmbeddedDocument[]> {
    const results: EmbeddedDocument[] = [];

    for (const doc of documents) {
      const embedded = await this.embedDocument(doc, options);
      results.push(embedded);
    }

    return results;
  }

  /**
   * Get query embedding (for similarity search)
   * Slightly different than document embedding - no chunking needed
   */
  async embedQuery(query: string): Promise<Embedding> {
    const { embedding } = await this.embed(query);
    return embedding;
  }

  /**
   * Compute cosine similarity between two embeddings
   */
  static cosineSimilarity(a: Embedding, b: Embedding): number {
    if (a.length !== b.length) {
      throw new Error("Embeddings must have same dimensions");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Find most similar embeddings from a list
   */
  static findMostSimilar(
    query: Embedding,
    candidates: Array<{ embedding: Embedding; [key: string]: unknown }>,
    topK = 5
  ): Array<{ index: number; score: number; item: (typeof candidates)[0] }> {
    const scored = candidates.map((item, index) => ({
      index,
      score: EmbeddingService.cosineSimilarity(query, item.embedding),
      item,
    }));

    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  /**
   * Create a new service instance with different config
   */
  withConfig(options: {
    provider?: ProviderId;
    model?: string;
    chunking?: Partial<ChunkingConfig>;
    batchSize?: number;
  }): EmbeddingService {
    return new EmbeddingService({
      provider: options.provider || this.provider,
      model: options.model || this.modelId,
      chunking: options.chunking,
      batchSize: options.batchSize || this.batchSize,
    });
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      provider: this.provider,
      model: this.modelId,
      batchSize: this.batchSize,
    };
  }
}

/**
 * Default embedding service instance
 */
export const embeddingService = new EmbeddingService();

/**
 * Convenience functions
 */
export async function embedText(text: string): Promise<Embedding> {
  const result = await embeddingService.embed(text);
  return result.embedding;
}

export async function embedQuery(query: string): Promise<Embedding> {
  return embeddingService.embedQuery(query);
}

export async function embedDocument(
  document: DocumentToEmbed,
  options?: EmbeddingOptions
): Promise<EmbeddedDocument> {
  return embeddingService.embedDocument(document, options);
}

export default embeddingService;
