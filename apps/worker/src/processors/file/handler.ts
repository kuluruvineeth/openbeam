import prisma, {
  createIndexedChunks,
  decryptIfEncrypted,
  deleteChunksByFileId,
  findChunksByFileId,
  findConnectorById,
  findIndexedFileById,
  getConnectorForSync,
  type OAuthProvider,
  updateIndexedFileDownloaded,
  updateIndexedFileIndexed,
  updateIndexedFileParsed,
  updateIndexedFileProcessingStatus,
  updateIndexedFileStatus,
} from "@openplane/db";
import {
  addFileIndexJob,
  addFileParseJob,
  createLinkedSpan,
  createProgressEmitter,
  type FileProcessingJobData,
  type ProgressEmitterParams,
} from "@openplane/redis";
import {
  EngineClient,
  getStorageProvider,
  SIGNED_URL_EXPIRY_SECONDS,
} from "@openplane/services";
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

interface ParsedChunk {
  text: string;
  page_number?: number;
  page_end?: number;
}

const engineUrl = process.env.ENGINE_URL || "http://localhost:8000";
const engineClient = new EngineClient(engineUrl);

type ProgressEmitter = ReturnType<typeof createProgressEmitter>;

const FILE_TOTAL_STEPS = 3;

export interface FileProcessingResult {
  success: boolean;
  fileId: string;
  nextStep?: "parse" | "index";
}

async function resolveFileProgressParams(
  data: FileProcessingJobData
): Promise<ProgressEmitterParams> {
  const { fileId, connectorId, fileName } = data;

  const file = await findIndexedFileById(prisma, fileId);
  if (file) {
    return {
      id: fileId,
      teamId: file.connector.teamId,
      type: "file",
      connectorId,
      fileName,
    };
  }

  const connector = await findConnectorById(prisma, connectorId);
  if (!connector) {
    throw new Error(`Connector not found: ${connectorId}`);
  }

  return {
    id: fileId,
    teamId: connector.teamId,
    type: "file",
    connectorId,
    fileName,
  };
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

  let progress: ProgressEmitter | undefined;

  try {
    logJobStart(`file-${type}`, job.id, { connectorId, fileId });

    const progressParams = await resolveFileProgressParams(job.data);
    progress = createProgressEmitter(progressParams);

    let result: FileProcessingResult;

    switch (type) {
      case "download":
        result = await processDownload(job.data, progress);
        break;
      case "parse":
        result = await processParse(job.data, progress);
        break;
      case "index":
        result = await processIndex(job.data, progress);
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

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (progress) {
      await progress.fail(errorMessage, FILE_TOTAL_STEPS);
    }

    await updateIndexedFileStatus(prisma, fileId, "FAILED", {
      lastError: errorMessage,
      errorCount: { increment: 1 },
    });

    throw error;
  } finally {
    span.end();
  }
}

async function processDownload(
  data: FileProcessingJobData,
  progress: ProgressEmitter
): Promise<FileProcessingResult> {
  const { fileId, connectorId, sourceUrl, fileName, externalId } = data;

  if (!sourceUrl) {
    throw new Error("Source URL required for download");
  }

  const storage = getStorageProvider();

  const connector = await getConnectorForSync(prisma, connectorId);

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

  await progress.start(FILE_TOTAL_STEPS, "Downloading");

  await updateIndexedFileProcessingStatus(prisma, fileId, "DOWNLOADING");

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

  await updateIndexedFileDownloaded(prisma, fileId, storageKey);

  await progress.update(1, FILE_TOTAL_STEPS, "Downloaded");

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
  data: FileProcessingJobData,
  progress: ProgressEmitter
): Promise<FileProcessingResult> {
  const { fileId, connectorId, storageKey, fileName, externalId } = data;

  if (!storageKey) {
    throw new Error("Storage key required for parsing");
  }

  const file = await findIndexedFileById(prisma, fileId);

  if (!file) {
    throw new Error("File not found");
  }

  await progress.update(1, FILE_TOTAL_STEPS, "Parsing");

  await updateIndexedFileProcessingStatus(prisma, fileId, "PARSING");

  const storage = getStorageProvider();
  const signedUrl = await storage.getSignedUrl(
    storageKey,
    SIGNED_URL_EXPIRY_SECONDS
  );

  const result = await engineClient.parseUrl(signedUrl, fileName, {
    chunk: true,
    maxChunkSize: 1500,
    overlap: 150,
  });

  const rawChunks = result.chunks ?? [];

  const parsedChunks: ParsedChunk[] = rawChunks.map((chunk) => {
    if (typeof chunk === "string") {
      return { text: chunk };
    }
    const richChunk = chunk as {
      text: string;
      page_number?: number;
      page_end?: number;
    };
    return {
      text: richChunk.text,
      page_number: richChunk.page_number,
      page_end: richChunk.page_end,
    };
  });

  await updateIndexedFileParsed(prisma, fileId, {
    textLength: result.text_length,
    pageCount: result.page_count,
    chunkCount: parsedChunks.length,
  });

  await progress.update(2, FILE_TOTAL_STEPS, "Parsed");

  logger.info(
    { fileId, textLength: result.text_length, chunks: parsedChunks.length },
    "File parsed"
  );

  await addFileIndexJob({
    fileId,
    connectorId,
    externalId,
    storageKey,
    mimeType: data.mimeType,
    fileName,
    parsedChunks,
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
  batchChunks: ParsedChunk[],
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

  const chunkDocs: GenericDocument[] = batchChunks.map((chunk, idx) => {
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
      title: chunk.page_number
        ? `${fileName} · Page ${chunk.page_number}`
        : (fileName ?? "Untitled"),
      content: chunk.text,
      content_plain: chunk.text,
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
      page_number: chunk.page_number,
      page_end: chunk.page_end,
    };
  });

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

  const indexResults = await Promise.allSettled(
    docsToIndex.map(async (doc, idx) => {
      const chunk = batchChunks[idx];
      if (!(doc && chunk)) {
        return null;
      }
      await vespaClient.feedDocument(doc);
      return {
        chunkIndex: batchStart + idx,
        vespaId: doc.id,
        checksum: calculateChecksum(chunk.text),
        contentLength: chunk.text.length,
      };
    })
  );

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
  const existingChunks = await findChunksByFileId(prisma, fileId);

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

  await deleteChunksByFileId(prisma, fileId);
}

async function processIndex(
  data: FileProcessingJobData,
  progress: ProgressEmitter
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

  await updateIndexedFileProcessingStatus(prisma, fileId, "INDEXING");

  const file = await findIndexedFileById(prisma, fileId);
  if (!file) {
    throw new Error("File not found");
  }

  await progress.update(2, FILE_TOTAL_STEPS, "Indexing");

  const rawChunks = parsedChunks ?? [];
  const chunks: ParsedChunk[] = rawChunks.map((c) =>
    typeof c === "string" ? { text: c } : (c as ParsedChunk)
  );
  const totalChunks = chunks.length;
  const fileVespaId = `file-${connectorId}-${externalId}`;
  const accessControl = [`team:${file.connector.teamId}`];

  await cleanupExistingChunks(fileId);

  const fileSummary = chunks
    .slice(0, 3)
    .map((c) => c.text)
    .join("\n\n")
    .slice(0, 2000);
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
      await createIndexedChunks(
        prisma,
        results.map((c) => ({
          fileId,
          connectorId,
          vespaId: c.vespaId,
          chunkIndex: c.chunkIndex,
          checksum: c.checksum,
          contentLength: c.contentLength,
        }))
      );
      totalIndexed += results.length;
    }
  }

  await updateIndexedFileIndexed(prisma, fileId, fileVespaId);

  await progress.complete(FILE_TOTAL_STEPS);

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
