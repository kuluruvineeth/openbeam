import type { BGEM3EmbeddingResult, BGEM3Provider } from "@openplane/ai";
import { getBGEM3Provider } from "@openplane/ai";
import {
  addReembedJob,
  createLinkedSpan,
  fence,
  type TraceContext,
} from "@openplane/redis";
import type { GenericDocument } from "@openplane/vespa";
import { escapeYqlString, vespaClient } from "@openplane/vespa";
import { SpanStatusCode } from "@opentelemetry/api";
import type { Job } from "bullmq";
import { z } from "zod";
import logger from "../../utils/logger";

// Process 10 documents per job for ~30s total (3s/doc average)
const BATCH_SIZE = 10;

// Embed 20 texts at once, process 3 chunks in parallel for throughput
const EMBED_CHUNK_SIZE = 20;
const EMBED_CONCURRENCY = 3;

const TraceContextSchema = z.object({
  traceId: z.string(),
  spanId: z.string(),
  traceFlags: z.number(),
  traceState: z.string().optional(),
});

const ReembedJobDataSchema = z.object({
  teamId: z.string().min(1),
  batchSize: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
  traceContext: TraceContextSchema.optional(),
});

export interface ReembedJobData {
  teamId: string;
  batchSize?: number;
  offset?: number;
  traceContext?: TraceContext;
}

export interface ReembedJobResult {
  processed: number;
  failed: number;
  remaining: number;
  total: number;
  hasMore: boolean;
}

interface UpdateResult {
  processed: number;
  failed: number;
}

export async function processReembedJob(
  job: Job<unknown>
): Promise<ReembedJobResult> {
  const parsed = ReembedJobDataSchema.safeParse(job.data);
  if (!parsed.success) {
    logger.error({ error: parsed.error.message }, "Invalid reembed job data");
    throw new Error(`Invalid job data: ${parsed.error.message}`);
  }

  const { teamId, batchSize = BATCH_SIZE, traceContext } = parsed.data;
  const fenceKey = `reembed:${teamId}`;

  const span = createLinkedSpan(
    "openplane-worker",
    "reembed-processor.process",
    traceContext,
    { "job.id": job.id || "", "team.id": teamId, "batch.size": batchSize }
  );

  const startTime = Date.now();
  let fenceToken: number | null = null;

  try {
    fenceToken = await fence.acquireFence(fenceKey);
    logger.debug({ teamId, fenceToken }, "Acquired fence token");

    const totalRemaining = await countDocumentsNeedingEmbedding(teamId);

    if (totalRemaining === 0) {
      logger.info({ teamId }, "All documents already embedded");
      span.setStatus({ code: SpanStatusCode.OK });
      return {
        processed: 0,
        failed: 0,
        remaining: 0,
        total: 0,
        hasMore: false,
      };
    }

    logger.info(
      { teamId, remaining: totalRemaining },
      "Starting re-embedding batch"
    );

    const documents = await fetchDocuments(teamId, batchSize);

    if (documents.length === 0) {
      logger.info({ teamId }, "No documents to process in this batch");
      span.setStatus({ code: SpanStatusCode.OK });
      return {
        processed: 0,
        failed: 0,
        remaining: 0,
        total: 0,
        hasMore: false,
      };
    }

    // Validate fence before processing
    const isValid = await fence.validateFence(fenceKey, fenceToken);
    if (!isValid) {
      logger.warn({ teamId }, "Fence superseded, aborting batch");
      return {
        processed: 0,
        failed: 0,
        remaining: totalRemaining,
        total: totalRemaining,
        hasMore: false,
      };
    }

    const { validDocs, emptyDocs } = splitDocuments(documents);

    const skipped = await markEmptyDocuments(emptyDocs);

    if (validDocs.length === 0) {
      logger.info(
        { teamId, skipped, fetched: documents.length },
        "Batch contained only empty documents"
      );

      const newRemaining = totalRemaining - skipped;
      const hasMore = newRemaining > 0;

      if (hasMore) {
        await addReembedJob({ teamId, batchSize, traceContext });
      }

      span.setStatus({ code: SpanStatusCode.OK });
      return {
        processed: 0,
        failed: 0,
        remaining: newRemaining,
        total: totalRemaining,
        hasMore,
      };
    }

    const bge = getBGEM3Provider();

    logger.info({ count: validDocs.length }, "Generating content embeddings");
    const embeddings = await generateEmbeddings(bge, validDocs);
    logger.info({ count: embeddings.length }, "Content embeddings complete");

    // Validate fence before bulk update
    const stillValid = await fence.validateFence(fenceKey, fenceToken);
    if (!stillValid) {
      logger.warn({ teamId }, "Fence superseded before update, aborting");
      return {
        processed: 0,
        failed: 0,
        remaining: totalRemaining,
        total: totalRemaining,
        hasMore: false,
      };
    }

    const result = await updateDocumentsBulk(embeddings);

    const newRemaining = totalRemaining - result.processed - skipped;
    const hasMore = newRemaining > 0;

    if (hasMore) {
      await addReembedJob({ teamId, batchSize, traceContext });
    }

    const durationMs = Date.now() - startTime;

    logger.info(
      {
        teamId,
        processed: result.processed,
        failed: result.failed,
        skipped,
        remaining: newRemaining,
        totalInitial: totalRemaining,
        hasMore,
        durationMs,
      },
      "Re-embedding batch complete"
    );

    setSpanSuccess({
      span,
      result,
      remaining: newRemaining,
      hasMore,
      durationMs,
    });

    return {
      ...result,
      remaining: newRemaining,
      total: totalRemaining,
      hasMore,
    };
  } catch (error) {
    setSpanError(span, error);
    throw error;
  } finally {
    if (fenceToken !== null) {
      await fence.releaseFence(fenceKey, fenceToken);
      logger.debug({ teamId, fenceToken }, "Released fence token");
    }
    span.end();
  }
}

async function countDocumentsNeedingEmbedding(teamId: string): Promise<number> {
  const escapedTeamId = escapeYqlString(teamId);
  const yql = `select id from openplane_document where team_id contains "${escapedTeamId}" and !(embedding_version = 2)`;
  const result = await vespaClient.query<GenericDocument>({
    yql,
    hits: 0,
    timeout: "30s",
  });
  return result.root.fields?.totalCount ?? 0;
}

async function fetchDocuments(
  teamId: string,
  limit: number
): Promise<GenericDocument[]> {
  const escapedTeamId = escapeYqlString(teamId);
  const yql = `select id, content, title from openplane_document where team_id contains "${escapedTeamId}" and !(embedding_version = 2)`;
  const result = await vespaClient.query<GenericDocument>({
    yql,
    hits: limit,
    timeout: "60s",
  });
  return result.root.children?.map((c) => c.fields) ?? [];
}

interface SplitResult {
  validDocs: GenericDocument[];
  emptyDocs: GenericDocument[];
}

function splitDocuments(documents: GenericDocument[]): SplitResult {
  const validDocs: GenericDocument[] = [];
  const emptyDocs: GenericDocument[] = [];

  for (const doc of documents) {
    if (doc.content?.trim()) {
      validDocs.push(doc);
    } else {
      emptyDocs.push(doc);
    }
  }

  return { validDocs, emptyDocs };
}

async function markEmptyDocuments(docs: GenericDocument[]): Promise<number> {
  if (docs.length === 0) {
    return 0;
  }

  const updates = docs.map((doc) => ({
    id: doc.id,
    fields: { embedding_version: 2 },
  }));

  const result = await vespaClient.partialUpdateBatch(updates);

  if (result.failed.length > 0) {
    logger.error(
      { total: docs.length, failed: result.failed.length },
      "Failed to mark some empty documents"
    );
    throw new Error(`Failed to mark ${result.failed.length} empty documents`);
  }

  if (result.succeeded.length > 0) {
    logger.info(
      { count: result.succeeded.length },
      "Marked empty documents as processed"
    );
  }

  return result.succeeded.length;
}

interface DocumentEmbeddings {
  docId: string;
  content: BGEM3EmbeddingResult;
  title: BGEM3EmbeddingResult | null;
}

async function embedInChunksParallel(
  bge: BGEM3Provider,
  texts: string[],
  mode: "query" | "document"
): Promise<BGEM3EmbeddingResult[]> {
  if (texts.length === 0) {
    return [];
  }

  const chunks: string[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_CHUNK_SIZE) {
    chunks.push(texts.slice(i, i + EMBED_CHUNK_SIZE));
  }

  const results: BGEM3EmbeddingResult[] = [];

  for (let i = 0; i < chunks.length; i += EMBED_CONCURRENCY) {
    const batch = chunks.slice(i, i + EMBED_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((chunk) => bge.embedBatch(chunk, mode))
    );
    results.push(...batchResults.flat());
  }

  return results;
}

async function generateEmbeddings(
  bge: BGEM3Provider,
  documents: GenericDocument[]
): Promise<DocumentEmbeddings[]> {
  if (documents.length === 0) {
    return [];
  }

  const contents = documents.map((d) => d.content);
  const contentEmbeddings = await embedInChunksParallel(
    bge,
    contents,
    "document"
  );

  const docsWithTitles = documents
    .map((d, i) => ({ doc: d, idx: i }))
    .filter(({ doc }) => doc.title?.trim());

  let titleEmbeddings: BGEM3EmbeddingResult[] = [];
  if (docsWithTitles.length > 0) {
    logger.info(
      { count: docsWithTitles.length },
      "Generating title embeddings"
    );
    const titles = docsWithTitles.map(({ doc }) => doc.title);
    titleEmbeddings = await embedInChunksParallel(bge, titles, "query");
    logger.info({ count: titleEmbeddings.length }, "Title embeddings complete");
  }

  const titleMap = new Map<number, BGEM3EmbeddingResult>();
  for (let i = 0; i < docsWithTitles.length; i++) {
    const item = docsWithTitles[i];
    const embedding = titleEmbeddings[i];
    if (item && embedding) {
      titleMap.set(item.idx, embedding);
    }
  }

  const results: DocumentEmbeddings[] = [];

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const contentEmbedding = contentEmbeddings[i];

    if (!(doc && contentEmbedding?.dense)) {
      logger.warn({ index: i }, "Skipping document with missing embedding");
      continue;
    }

    results.push({
      docId: doc.id,
      content: contentEmbedding,
      title: titleMap.get(i) ?? null,
    });
  }

  return results;
}

function formatDenseTensor(values: number[]): { values: number[] } {
  return { values };
}

function formatSparseTensor(sparse: Record<string, number>): {
  cells: Array<{ address: { token: string }; value: number }>;
} {
  const cells = Object.entries(sparse).map(([token, value]) => ({
    address: { token },
    value,
  }));
  return { cells };
}

function buildEmbeddingUpdate(
  embedding: DocumentEmbeddings
): Record<string, unknown> {
  const update: Record<string, unknown> = {
    embedding: formatDenseTensor(embedding.content.dense),
    embedding_version: 2,
  };

  if (embedding.content.sparse) {
    update.sparse_embedding = formatSparseTensor(embedding.content.sparse);
  }

  if (embedding.title) {
    update.title_embedding_v2 = formatDenseTensor(embedding.title.dense);
  }

  return update;
}

async function updateDocumentsBulk(
  embeddings: DocumentEmbeddings[]
): Promise<UpdateResult> {
  if (embeddings.length === 0) {
    return { processed: 0, failed: 0 };
  }

  const updates = embeddings.map((embedding) => ({
    id: embedding.docId,
    fields: buildEmbeddingUpdate(embedding),
  }));

  const result = await vespaClient.partialUpdateBatch(updates);
  const processed = result.succeeded.length;
  const failed = result.failed.length;

  if (failed > 0) {
    logger.warn({ processed, failed }, "Some document updates failed");
  }

  return { processed, failed };
}

interface SpanSuccessInfo {
  span: ReturnType<typeof createLinkedSpan>;
  result: UpdateResult;
  remaining: number;
  hasMore: boolean;
  durationMs: number;
}

function setSpanSuccess(info: SpanSuccessInfo): void {
  const { span, result, remaining, hasMore, durationMs } = info;
  span.setAttributes({
    "reembed.processed": result.processed,
    "reembed.failed": result.failed,
    "reembed.remaining": remaining,
    "reembed.has_more": hasMore,
    "reembed.duration_ms": durationMs,
  });
  span.setStatus({ code: SpanStatusCode.OK });
}

function setSpanError(
  span: ReturnType<typeof createLinkedSpan>,
  error: unknown
): void {
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error instanceof Error ? error.message : String(error),
  });
  span.recordException(error as Error);
}
