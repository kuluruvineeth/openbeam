import { getEmbeddingCache } from "@openplane/redis";
import { embed, embedMany } from "ai";
import { getConfig, type ProviderId } from "../config";
import { registry } from "../providers/registry";
import {
  DEFAULT_CHUNKING_CONFIG,
  DocumentChunker,
  estimateTokens,
} from "./chunker";
import type {
  BatchEmbeddingResult,
  CachedBatchEmbeddingResult,
  CachedEmbeddingResult,
  ChunkingConfig,
  DocumentToEmbed,
  EmbeddedChunk,
  EmbeddedDocument,
  Embedding,
  EmbeddingOptions,
  EmbeddingResult,
  SimilarityResult,
} from "./types";

export class EmbeddingService {
  private readonly providerId: ProviderId;
  private readonly modelId: string;
  private readonly chunker: DocumentChunker;
  private readonly batchSize: number;

  constructor(
    options: {
      providerId?: ProviderId;
      modelId?: string;
      chunking?: Partial<ChunkingConfig>;
      batchSize?: number;
    } = {}
  ) {
    const config = getConfig();

    this.providerId = options.providerId || "openai";
    this.modelId = options.modelId || config.defaultEmbeddingModel;
    this.chunker = new DocumentChunker(options.chunking);
    this.batchSize = options.batchSize || config.embedding.batchSize;
  }

  private getModel() {
    return registry.embeddingModel(this.providerId, this.modelId);
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const { embedding, usage } = await embed({
      model: this.getModel(),
      value: text,
    });

    return {
      embedding,
      text,
      tokenCount: usage?.tokens || estimateTokens(text),
    };
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    if (texts.length === 0) {
      return { embeddings: [], texts: [], totalTokens: 0 };
    }

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
        usage?.tokens || batch.reduce((sum, t) => sum + estimateTokens(t), 0);
    }

    return {
      embeddings: allEmbeddings,
      texts,
      totalTokens,
    };
  }

  async embedDocument(
    document: DocumentToEmbed,
    options: EmbeddingOptions = {}
  ): Promise<EmbeddedDocument> {
    const startTime = Date.now();

    const chunker = options.chunking
      ? new DocumentChunker({ ...DEFAULT_CHUNKING_CONFIG, ...options.chunking })
      : this.chunker;

    const chunks = chunker.chunk(document.content, document.id);

    if (chunks.length === 0) {
      return {
        documentId: document.id,
        title: document.title,
        chunks: [],
        totalTokens: 0,
        processingTimeMs: Date.now() - startTime,
      };
    }

    const texts = chunks.map((c) => c.text);

    if (document.title && texts.length > 0 && texts[0]) {
      texts[0] = `${document.title}\n\n${texts[0]}`;
    }

    const { embeddings, totalTokens } = await this.embedBatch(texts);

    let titleEmbedding: Embedding | undefined;
    let titleTokens = 0;

    if (options.embedTitle && document.title) {
      const titleResult = await this.embed(document.title);
      titleEmbedding = titleResult.embedding;
      titleTokens = titleResult.tokenCount;
    }

    const embeddedChunks: EmbeddedChunk[] = chunks.map((chunk, index) => {
      const embedding = embeddings[index];
      if (!embedding) {
        throw new Error(`Missing embedding for chunk ${index}`);
      }
      return {
        id: chunk.id,
        documentId: document.id,
        chunkIndex: index,
        text: chunk.text,
        embedding,
        tokenCount: chunk.tokenCount,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        metadata: {
          ...document.metadata,
          ...chunk.metadata,
        },
      };
    });

    return {
      documentId: document.id,
      title: document.title,
      titleEmbedding,
      chunks: embeddedChunks,
      totalTokens: totalTokens + titleTokens,
      processingTimeMs: Date.now() - startTime,
    };
  }

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

  async embedQuery(query: string): Promise<Embedding> {
    const { embedding } = await this.embed(query);
    return embedding;
  }

  async embedWithCache(text: string): Promise<CachedEmbeddingResult> {
    const cache = getEmbeddingCache();
    const cached = await cache.get(text, this.modelId);

    if (cached) {
      return {
        embedding: cached,
        text,
        tokenCount: 0,
        fromCache: true,
      };
    }

    const result = await this.embed(text);
    await cache.set(text, this.modelId, result.embedding);
    return { ...result, fromCache: false };
  }

  async embedQueryWithCache(query: string): Promise<Embedding> {
    const result = await this.embedWithCache(query);
    return result.embedding;
  }

  async embedBatchWithCache(
    texts: string[]
  ): Promise<CachedBatchEmbeddingResult> {
    if (texts.length === 0) {
      return { embeddings: [], texts: [], totalTokens: 0, cacheHits: 0 };
    }

    const cache = getEmbeddingCache();
    const cached = await cache.getBatch(texts, this.modelId);

    const uncachedTexts: string[] = [];
    const uncachedIndexes: number[] = [];
    const embeddings: Embedding[] = new Array(texts.length);
    let cacheHits = 0;

    for (let i = 0; i < texts.length; i += 1) {
      const text = texts[i];
      if (text === undefined) {
        continue;
      }
      const cachedEmb = cached.get(text);
      if (cachedEmb) {
        embeddings[i] = cachedEmb;
        cacheHits += 1;
      } else {
        uncachedTexts.push(text);
        uncachedIndexes.push(i);
      }
    }

    if (uncachedTexts.length > 0) {
      const freshResult = await this.embedBatch(uncachedTexts);

      const toCache: Array<{ text: string; embedding: number[] }> = [];
      for (let j = 0; j < uncachedTexts.length; j += 1) {
        const idx = uncachedIndexes[j];
        const emb = freshResult.embeddings[j];
        const text = uncachedTexts[j];
        if (idx === undefined || emb === undefined || text === undefined) {
          continue;
        }
        embeddings[idx] = emb;
        toCache.push({ text, embedding: emb });
      }

      await cache.setBatch(toCache, this.modelId);

      return {
        embeddings,
        texts,
        totalTokens: freshResult.totalTokens,
        cacheHits,
      };
    }

    return {
      embeddings,
      texts,
      totalTokens: 0,
      cacheHits,
    };
  }

  static cosineSimilarity(a: Embedding, b: Embedding): number {
    if (a.length !== b.length) {
      throw new Error(
        `Embedding dimensions don't match: ${a.length} vs ${b.length}`
      );
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const aVal = a[i] ?? 0;
      const bVal = b[i] ?? 0;
      dotProduct += aVal * bVal;
      normA += aVal * aVal;
      normB += bVal * bVal;
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  static findMostSimilar<T extends { embedding: Embedding }>(
    queryEmbedding: Embedding,
    candidates: T[],
    topK = 5
  ): SimilarityResult<T>[] {
    const scored = candidates.map((item) => ({
      item,
      score: EmbeddingService.cosineSimilarity(queryEmbedding, item.embedding),
      embedding: item.embedding,
    }));

    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  withConfig(options: {
    providerId?: ProviderId;
    modelId?: string;
    chunking?: Partial<ChunkingConfig>;
    batchSize?: number;
  }): EmbeddingService {
    return new EmbeddingService({
      providerId: options.providerId || this.providerId,
      modelId: options.modelId || this.modelId,
      chunking: options.chunking,
      batchSize: options.batchSize || this.batchSize,
    });
  }

  getConfig() {
    return {
      providerId: this.providerId,
      modelId: this.modelId,
      batchSize: this.batchSize,
      chunking: this.chunker.getConfig(),
    };
  }
}

export const embeddingService = new EmbeddingService();

export async function embedText(text: string): Promise<Embedding> {
  const result = await embeddingService.embed(text);
  return result.embedding;
}

export function embedQuery(query: string): Promise<Embedding> {
  return embeddingService.embedQuery(query);
}

export function embedDocument(
  document: DocumentToEmbed,
  options?: EmbeddingOptions
): Promise<EmbeddedDocument> {
  return embeddingService.embedDocument(document, options);
}

export function embedDocuments(
  documents: DocumentToEmbed[],
  options?: EmbeddingOptions
): Promise<EmbeddedDocument[]> {
  return embeddingService.embedDocuments(documents, options);
}

export function embedWithCache(text: string): Promise<CachedEmbeddingResult> {
  return embeddingService.embedWithCache(text);
}

export function embedQueryWithCache(query: string): Promise<Embedding> {
  return embeddingService.embedQueryWithCache(query);
}

export function embedBatchWithCache(
  texts: string[]
): Promise<CachedBatchEmbeddingResult> {
  return embeddingService.embedBatchWithCache(texts);
}
