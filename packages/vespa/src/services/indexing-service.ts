/**
 * Indexing Service
 *
 * High-level service for bulk indexing operations with progress tracking,
 * batching, and error handling.
 */

import { codeClient } from "../clients/code-client";
import { documentClient } from "../clients/document-client";
import { entityClient } from "../clients/entity-client";
import { personClient } from "../clients/person-client";
import type {
  CodeInput,
  DocumentInput,
  EntityInput,
  PersonInput,
} from "../types";

// === Types ===

export interface IndexingProgress {
  total: number;
  processed: number;
  indexed: number;
  failed: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  estimatedTimeRemainingMs: number;
}

export interface IndexingResult {
  total: number;
  indexed: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
  durationMs: number;
}

export interface BulkIndexOptions {
  batchSize?: number;
  concurrency?: number;
  onProgress?: (progress: IndexingProgress) => void;
  onError?: (error: { id: string; error: string }) => void;
  continueOnError?: boolean;
}

// === Indexing Service ===

export class IndexingService {
  private readonly defaultBatchSize = 100;
  private readonly defaultConcurrency = 10;

  // === Documents ===

  /**
   * Bulk index documents
   */
  async indexDocuments(
    documents: DocumentInput[],
    options: BulkIndexOptions = {}
  ): Promise<IndexingResult> {
    return await this.bulkIndex(
      documents,
      (doc) => documentClient.feed(doc),
      options
    );
  }

  /**
   * Index a single document with embedding generation
   */
  async indexDocument(
    document: DocumentInput,
    generateEmbedding?: (text: string) => Promise<number[]>
  ) {
    let docWithEmbedding = document;

    if (generateEmbedding && !document.content_embedding) {
      const text = `${document.title}\n\n${document.content}`;
      docWithEmbedding = {
        ...document,
        content_embedding: await generateEmbedding(text),
      };
    }

    return documentClient.feed(docWithEmbedding);
  }

  /**
   * Update document embeddings in bulk
   */
  async updateDocumentEmbeddings(
    documents: Array<{ id: string; embedding: number[] }>,
    options: BulkIndexOptions = {}
  ): Promise<IndexingResult> {
    return await this.bulkIndex(
      documents,
      (doc) =>
        documentClient.update(doc.id, { content_embedding: doc.embedding }),
      options
    );
  }

  // === People ===

  /**
   * Bulk index people
   */
  async indexPeople(
    people: PersonInput[],
    options: BulkIndexOptions = {}
  ): Promise<IndexingResult> {
    return await this.bulkIndex(
      people,
      (person) => personClient.feed(person),
      options
    );
  }

  /**
   * Index a single person with embedding generation
   */
  async indexPerson(
    person: PersonInput,
    generateEmbedding?: (text: string) => Promise<number[]>
  ) {
    let personWithEmbedding = person;

    if (generateEmbedding && !person.profile_embedding) {
      const text = [
        person.name,
        person.job_title,
        person.department,
        ...(person.skills || []),
        ...(person.expertise_areas || []),
        person.bio,
      ]
        .filter(Boolean)
        .join(" ");

      personWithEmbedding = {
        ...person,
        profile_embedding: await generateEmbedding(text),
      };
    }

    return personClient.feed(personWithEmbedding);
  }

  // === Code ===

  /**
   * Bulk index code files
   */
  async indexCode(
    files: CodeInput[],
    options: BulkIndexOptions = {}
  ): Promise<IndexingResult> {
    return await this.bulkIndex(
      files,
      (file) => codeClient.feed(file),
      options
    );
  }

  /**
   * Index a single code file with embedding generation
   */
  async indexCodeFile(
    file: CodeInput,
    generateEmbedding?: (text: string) => Promise<number[]>
  ) {
    let fileWithEmbedding = file;

    if (generateEmbedding && !file.content_embedding) {
      const text = [file.docstring, file.content, ...(file.symbols || [])]
        .filter(Boolean)
        .join("\n");

      fileWithEmbedding = {
        ...file,
        content_embedding: await generateEmbedding(text),
      };
    }

    return codeClient.feed(fileWithEmbedding);
  }

  // === Entities ===

  /**
   * Bulk index entities
   */
  async indexEntities(
    entities: EntityInput[],
    options: BulkIndexOptions = {}
  ): Promise<IndexingResult> {
    return await this.bulkIndex(
      entities,
      (entity) => entityClient.feed(entity),
      options
    );
  }

  /**
   * Index a single entity with embedding generation
   */
  async indexEntity(
    entity: EntityInput,
    generateEmbedding?: (text: string) => Promise<number[]>
  ) {
    let entityWithEmbedding = entity;

    if (generateEmbedding && !entity.entity_embedding) {
      const text = [
        entity.name,
        entity.display_name,
        entity.description,
        ...(entity.tags || []),
        ...(entity.topics || []),
      ]
        .filter(Boolean)
        .join(" ");

      entityWithEmbedding = {
        ...entity,
        entity_embedding: await generateEmbedding(text),
      };
    }

    return entityClient.feed(entityWithEmbedding);
  }

  // === Deletion ===

  /**
   * Delete all documents for a connector
   */
  async deleteByConnector(connectorId: string): Promise<void> {
    //TODO: Note: In production, this should use Vespa's deletion selection API
    await Promise.resolve();
    console.warn(
      `Bulk deletion for connector ${connectorId} - implement with visitor API`
    );
  }

  /**
   * Delete specific documents
   */
  async deleteDocuments(
    ids: string[],
    options: BulkIndexOptions = {}
  ): Promise<IndexingResult> {
    return await this.bulkIndex(
      ids.map((id) => ({ id })),
      (item) => documentClient.delete(item.id).then(() => ({})),
      options
    );
  }

  // === Private Helpers ===

  private async bulkIndex<T extends { id: string }>(
    items: T[],
    indexFn: (item: T) => Promise<unknown>,
    options: BulkIndexOptions
  ): Promise<IndexingResult> {
    const {
      batchSize = this.defaultBatchSize,
      concurrency = this.defaultConcurrency,
      onProgress,
      onError,
      continueOnError = true,
    } = options;

    const batches = this.splitIntoBatches(items, batchSize);

    const ctx: BulkIndexContext = {
      result: {
        total: items.length,
        indexed: 0,
        failed: 0,
        errors: [],
        durationMs: 0,
      },
      onError,
      continueOnError,
      startTime: Date.now(),
      totalItems: items.length,
      totalBatches: batches.length,
    };

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
      const batch = batches[batchIndex];
      if (!batch) {
        continue;
      }

      await this.processBatch(batch, indexFn, concurrency, ctx);
      this.reportProgress(onProgress, ctx, batchIndex + 1);
    }

    ctx.result.durationMs = Date.now() - ctx.startTime;
    return ctx.result;
  }

  private splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processBatch<T extends { id: string }>(
    batch: T[],
    indexFn: (item: T) => Promise<unknown>,
    concurrency: number,
    ctx: BulkIndexContext
  ): Promise<void> {
    for (let i = 0; i < batch.length; i += concurrency) {
      const chunk = batch.slice(i, i + concurrency);
      const results = await Promise.allSettled(chunk.map(indexFn));
      this.processChunkResults(chunk, results, ctx);
    }
  }

  private processChunkResults<T extends { id: string }>(
    chunk: T[],
    results: PromiseSettledResult<unknown>[],
    ctx: BulkIndexContext
  ): void {
    for (let j = 0; j < results.length; j += 1) {
      const res = results[j];
      const item = chunk[j];
      if (!item) {
        continue;
      }

      if (res?.status === "fulfilled") {
        ctx.result.indexed += 1;
      } else {
        this.handleIndexError(item, res, ctx);
      }
    }
  }

  private handleIndexError<T extends { id: string }>(
    item: T,
    res: PromiseSettledResult<unknown> | undefined,
    ctx: BulkIndexContext
  ): void {
    ctx.result.failed += 1;
    const error = {
      id: item.id,
      error:
        res?.status === "rejected" && res.reason instanceof Error
          ? res.reason.message
          : String(res?.status === "rejected" ? res.reason : "Unknown error"),
    };
    ctx.result.errors.push(error);
    ctx.onError?.(error);

    if (!ctx.continueOnError) {
      ctx.result.durationMs = Date.now() - ctx.startTime;
      throw new Error(`Indexing failed for ${item.id}: ${error.error}`);
    }
  }

  private reportProgress(
    onProgress: BulkIndexOptions["onProgress"],
    ctx: BulkIndexContext,
    currentBatch: number
  ): void {
    if (!onProgress) {
      return;
    }

    const processed = ctx.result.indexed + ctx.result.failed;
    const elapsed = Date.now() - ctx.startTime;
    const avgTimePerItem = processed > 0 ? elapsed / processed : 0;

    onProgress({
      total: ctx.totalItems,
      processed,
      indexed: ctx.result.indexed,
      failed: ctx.result.failed,
      percentage: (processed / ctx.totalItems) * 100,
      currentBatch,
      totalBatches: ctx.totalBatches,
      estimatedTimeRemainingMs: avgTimePerItem * (ctx.totalItems - processed),
    });
  }
}

interface BulkIndexContext {
  result: IndexingResult;
  onError: BulkIndexOptions["onError"];
  continueOnError: boolean;
  startTime: number;
  totalItems: number;
  totalBatches: number;
}

export const indexingService = new IndexingService();
