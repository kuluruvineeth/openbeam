import prisma, { decryptIfEncrypted, type OAuthProvider } from "@openplane/db";
import {
  addFileIndexJob,
  addFileParseJob,
  createLinkedSpan,
  type FileProcessingJobData,
} from "@openplane/redis";
import { EngineClient } from "@openplane/services";
import { S3StorageProvider } from "@openplane/storage";
import { type GenericDocument, vespaClient } from "@openplane/vespa";
import { SpanStatusCode } from "@opentelemetry/api";
import type { Job } from "bullmq";
import { calculateChecksum } from "../../utils/checksum";
import {
  generateEmbeddingsForDocuments,
  isEmbeddingEnabled,
} from "../../utils/embeddings";
import logger from "../../utils/logger";
import { logJobError, logJobStart } from "../event-handlers";

const engineUrl = process.env.ENGINE_URL || "http://localhost:8000";
const engineClient = new EngineClient(engineUrl);

const storageConfig = {
  region: process.env.GCS_REGION || "us-central1",
  accessKeyId: process.env.GCS_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.GCS_SECRET_ACCESS_KEY || "",
  bucket: process.env.GCS_BUCKET || "openplane-files",
  endpoint: process.env.GCS_ENDPOINT,
};

export interface FileProcessingResult {
  success: boolean;
  fileId: string;
  nextStep?: "parse" | "index";
}

export async function processFileJob(
  job: Job<FileProcessingJobData>
): Promise<FileProcessingResult> {
  const { type, fileId, connectorId, traceContext } = job.data;

  const span = createLinkedSpan(
    "openplane-worker",
    `file-processor.${type}`,
    traceContext,
    {
      "job.id": job.id || "",
      "file.id": fileId,
      "connector.id": connectorId,
      "file.type": type,
    }
  );

  try {
    logJobStart(`file-${type}`, job.id, { connectorId, fileId });

    let result: FileProcessingResult;

    switch (type) {
      case "download":
        result = await processDownload(job.data);
        break;
      case "parse":
        result = await processParse(job.data);
        break;
      case "index":
        result = await processIndex(job.data);
        break;
      default:
        throw new Error(`Unknown file processing type: ${type}`);
    }

    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);
    logJobError(`file-${type}`, job.id, error, { connectorId, fileId });

    await prisma.indexedFile.update({
      where: { id: fileId },
      data: {
        processingStatus: "FAILED",
        lastError: error instanceof Error ? error.message : String(error),
        errorCount: { increment: 1 },
      },
    });

    throw error;
  } finally {
    span.end();
  }
}

async function processDownload(
  data: FileProcessingJobData
): Promise<FileProcessingResult> {
  const { fileId, connectorId, sourceUrl, fileName, externalId } = data;

  if (!sourceUrl) {
    throw new Error("Source URL required for download");
  }

  const storage = new S3StorageProvider(storageConfig);

  const connector = await prisma.connector.findUnique({
    where: { id: connectorId },
    include: { oauthProvider: true },
  });

  const oauth: OAuthProvider | null | undefined = connector?.oauthProvider;

  const syncToken = oauth
    ? decryptIfEncrypted(oauth.syncAccessToken, oauth.syncAccessTokenIv)
    : null;
  const botToken = oauth
    ? decryptIfEncrypted(oauth.accessToken, oauth.accessTokenIv)
    : null;
  const downloadToken = syncToken ?? botToken;

  if (!downloadToken) {
    throw new Error("Connector access token not found");
  }

  if (!connector) {
    throw new Error("Connector not found");
  }

  await prisma.indexedFile.update({
    where: { id: fileId },
    data: { processingStatus: "DOWNLOADING" },
  });

  const response = await fetch(sourceUrl, {
    headers: {
      Authorization: `Bearer ${downloadToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const content = await response.arrayBuffer();
  const buffer = Buffer.from(content);

  const storageKey = `${connector.teamId}/${connectorId}/files/${externalId}/${fileName}`;

  await storage.upload(storageKey, buffer, {
    contentType: data.mimeType,
  });

  await prisma.indexedFile.update({
    where: { id: fileId },
    data: {
      processingStatus: "DOWNLOADED",
      storageKey,
      uploadedAt: new Date(),
    },
  });

  logger.info({ fileId, storageKey }, "File downloaded");

  await addFileParseJob({
    fileId,
    connectorId,
    externalId,
    storageKey,
    mimeType: data.mimeType,
    fileName,
  });

  return { success: true, fileId, nextStep: "parse" };
}

async function processParse(
  data: FileProcessingJobData
): Promise<FileProcessingResult> {
  const { fileId, connectorId, storageKey, fileName, externalId } = data;

  if (!storageKey) {
    throw new Error("Storage key required for parsing");
  }

  await prisma.indexedFile.update({
    where: { id: fileId },
    data: { processingStatus: "PARSING" },
  });

  const storage = new S3StorageProvider(storageConfig);
  const signedUrl = await storage.getSignedUrl(storageKey, 3600);

  const result = await engineClient.parseUrl(signedUrl, fileName, {
    chunk: true,
    maxChunkSize: 1500,
    overlap: 150,
  });

  const chunks = result.chunks ?? [];

  await prisma.indexedFile.update({
    where: { id: fileId },
    data: {
      processingStatus: "PARSED",
      extractedText: true,
      textLength: result.text_length,
      pageCount: result.page_count,
      chunkCount: chunks.length,
      processedAt: new Date(),
    },
  });

  logger.info(
    { fileId, textLength: result.text_length, chunks: chunks.length },
    "File parsed"
  );

  // Pass parsed chunks to the index job
  await addFileIndexJob({
    fileId,
    connectorId,
    externalId,
    storageKey,
    mimeType: data.mimeType,
    fileName,
    parsedChunks: chunks,
    textLength: result.text_length,
    pageCount: result.page_count ?? undefined,
  });

  return { success: true, fileId, nextStep: "index" };
}

type ChunkResult = {
  chunkIndex: number;
  vespaId: string;
  checksum: string;
  contentLength: number;
};

interface ChunkIndexContext {
  fileId: string;
  connectorId: string;
  externalId: string;
  fileName: string | undefined;
  mimeType: string | undefined;
  fileVespaId: string;
  totalChunks: number;
  accessControl: string[];
  file: Awaited<ReturnType<typeof prisma.indexedFile.findUnique>> & {
    connector: { app: string; teamId: string; workspaceExternalId: string };
  };
}

async function indexChunkBatch(
  batchChunks: string[],
  batchStart: number,
  ctx: ChunkIndexContext,
  embeddingsEnabled: boolean
): Promise<ChunkResult[]> {
  const {
    connectorId,
    externalId,
    fileName,
    mimeType,
    fileVespaId,
    totalChunks,
    accessControl,
    file,
  } = ctx;

  // Build chunk documents
  const chunkDocs: GenericDocument[] = batchChunks.map((chunkText, idx) => {
    const i = batchStart + idx;
    return {
      id: `chunk-${connectorId}-${externalId}-${i}`,
      connector_id: connectorId,
      connector_type: file.connector.app.toLowerCase(),
      team_id: file.connector.teamId,
      workspace_id: file.connector.workspaceExternalId,
      external_id: `${externalId}-chunk-${i}`,
      document_type: "file_chunk",
      document_subtype: mimeType,
      title: `${fileName} - Chunk ${i + 1}/${totalChunks}`,
      content: chunkText,
      content_plain: chunkText,
      file_name: fileName,
      parent_id: fileVespaId,
      parent_doc_id: fileVespaId,
      created_at: file.uploadedAt?.getTime() ?? Date.now(),
      updated_at: Date.now(),
      indexed_at: Date.now(),
      is_public: false,
      is_chunk: true,
      chunk_index: i,
      total_chunks: totalChunks,
      access_control: accessControl,
    };
  });

  // Generate embeddings if enabled
  let docsToIndex = chunkDocs;
  if (embeddingsEnabled) {
    try {
      docsToIndex = await generateEmbeddingsForDocuments(
        chunkDocs,
        connectorId
      );
    } catch (error) {
      logger.warn(
        { batchStart, error },
        "Embedding generation failed, indexing without"
      );
    }
  }

  // Index to Vespa in parallel
  const indexResults = await Promise.allSettled(
    docsToIndex.map(async (doc, idx) => {
      const chunkText = batchChunks[idx];
      if (!(doc && chunkText)) {
        return null;
      }
      await vespaClient.feedDocument(doc);
      return {
        chunkIndex: batchStart + idx,
        vespaId: doc.id,
        checksum: calculateChecksum(chunkText),
        contentLength: chunkText.length,
      };
    })
  );

  // Collect successful results
  const results: ChunkResult[] = [];
  for (const r of indexResults) {
    if (r.status === "fulfilled" && r.value) {
      results.push(r.value);
    }
  }

  const failures = indexResults.filter((r) => r.status === "rejected").length;
  if (failures > 0) {
    logger.warn({ batchStart, failures }, "Some chunks failed to index");
  }

  return results;
}

async function cleanupExistingChunks(fileId: string): Promise<void> {
  const existingChunks = await prisma.indexedChunk.findMany({
    where: { fileId },
    select: { vespaId: true },
  });

  for (const chunk of existingChunks) {
    try {
      await vespaClient.deleteDocument(chunk.vespaId);
    } catch (error) {
      logger.warn(
        { vespaId: chunk.vespaId, error },
        "Failed to delete old chunk"
      );
    }
  }

  await prisma.indexedChunk.deleteMany({ where: { fileId } });
}

async function processIndex(
  data: FileProcessingJobData
): Promise<FileProcessingResult> {
  const {
    fileId,
    connectorId,
    storageKey,
    fileName,
    externalId,
    parsedChunks,
  } = data;

  if (!storageKey) {
    throw new Error("Storage key required for indexing");
  }

  await prisma.indexedFile.update({
    where: { id: fileId },
    data: { processingStatus: "INDEXING" },
  });

  const file = await prisma.indexedFile.findUnique({
    where: { id: fileId },
    include: { connector: true },
  });
  if (!file) {
    throw new Error("File not found");
  }

  const chunks = parsedChunks ?? [];
  const totalChunks = chunks.length;
  const fileVespaId = `file-${connectorId}-${externalId}`;
  const accessControl = [`team:${file.connector.teamId}`];

  // Clean up existing chunks
  await cleanupExistingChunks(fileId);

  // Index file-level document
  const fileSummary = chunks.slice(0, 3).join("\n\n").slice(0, 2000);
  await vespaClient.feedDocument({
    id: fileVespaId,
    connector_id: connectorId,
    connector_type: file.connector.app.toLowerCase(),
    team_id: file.connector.teamId,
    workspace_id: file.connector.workspaceExternalId,
    external_id: externalId,
    document_type: "file",
    document_subtype: data.mimeType,
    mime_type: data.mimeType,
    title: fileName || "",
    content: fileSummary,
    content_plain: fileSummary,
    file_name: fileName,
    file_extension: file.fileExtension ?? undefined,
    file_size: file.fileSize,
    created_at: file.uploadedAt?.getTime() ?? Date.now(),
    updated_at: Date.now(),
    indexed_at: Date.now(),
    is_public: false,
    is_chunk: false,
    total_chunks: totalChunks,
    access_control: accessControl,
    metadata: {
      storageKey,
      pageCount: file.pageCount,
      chunkCount: totalChunks,
    },
  });

  // Index chunks in batches
  const embeddingsEnabled = isEmbeddingEnabled();
  const batchSize = Number(process.env.CHUNK_BATCH_SIZE) || 10;
  const ctx: ChunkIndexContext = {
    fileId,
    connectorId,
    externalId,
    fileName,
    mimeType: data.mimeType,
    fileVespaId,
    totalChunks,
    accessControl,
    file,
  };

  let totalIndexed = 0;
  for (
    let batchStart = 0;
    batchStart < chunks.length;
    batchStart += batchSize
  ) {
    const batchChunks = chunks.slice(batchStart, batchStart + batchSize);
    const results = await indexChunkBatch(
      batchChunks,
      batchStart,
      ctx,
      embeddingsEnabled
    );

    if (results.length > 0) {
      await prisma.indexedChunk.createMany({
        data: results.map((c) => ({
          fileId,
          connectorId,
          vespaId: c.vespaId,
          chunkIndex: c.chunkIndex,
          checksum: c.checksum,
          contentLength: c.contentLength,
        })),
        skipDuplicates: true,
      });
      totalIndexed += results.length;
    }
  }

  await prisma.indexedFile.update({
    where: { id: fileId },
    data: {
      processingStatus: "INDEXED",
      vespaId: fileVespaId,
      indexedAt: new Date(),
    },
  });

  logger.info(
    {
      fileId,
      vespaId: fileVespaId,
      totalChunks,
      indexedChunks: totalIndexed,
      withEmbeddings: embeddingsEnabled,
    },
    "File and chunks indexed"
  );
  return { success: true, fileId };
}
