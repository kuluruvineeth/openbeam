import { Queue } from "bullmq";
import { getSharedBullMqConnection } from "../client";
import { extractTraceContext, type TraceContext } from "../utils/trace-context";

export type FileProcessingJobType = "download" | "parse" | "index";

export interface ParsedChunk {
  text: string;
  page_number?: number;
  page_end?: number;
  sectionId?: string;
  sectionTitle?: string;
  sectionPath?: string[];
  sectionLevel?: number;
  elementTypes?: string[];
}

export interface DocumentStructureMetadata {
  hasToc: boolean;
  totalSections: number;
  maxDepth: number;
  outlineHash: string;
}

export interface SpreadsheetColumnMetadata {
  name: string;
  type: string;
  nullable: boolean;
}

export interface SpreadsheetMetadata {
  columns: SpreadsheetColumnMetadata[];
  sheets: string[];
  activeSheet: string;
  rowCount: number;
  sampleData: Record<string, unknown>[];
  contentSummary: string;
}

export type FileDownloadMetadata =
  | { connector: "slack"; sourceUrl: string }
  | { connector: "gmail"; messageId: string; attachmentId: string }
  | { connector: "google-drive"; fileId: string; exportMimeType?: string };

export interface FileProcessingJobData {
  type: FileProcessingJobType;
  fileId: string;
  connectorId: string;
  externalId: string;
  storageKey?: string;
  /** @deprecated Use downloadMetadata instead */
  sourceUrl?: string;
  downloadMetadata?: FileDownloadMetadata;
  mimeType?: string;
  fileName?: string;
  traceContext?: TraceContext;
  parsedChunks?: ParsedChunk[];
  textLength?: number;
  pageCount?: number;
  spreadsheetMetadata?: SpreadsheetMetadata;
  documentStructure?: DocumentStructureMetadata;
}

export const fileProcessingQueue = new Queue<FileProcessingJobData>(
  "file-processing",
  {
    connection: getSharedBullMqConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: {
        count: 500,
        age: 24 * 3600,
      },
      removeOnFail: {
        count: 1000,
      },
    },
  }
);

export async function addFileDownloadJob(
  data: Omit<FileProcessingJobData, "type" | "traceContext">,
  priority = 5
) {
  const jobData: FileProcessingJobData = {
    ...data,
    type: "download",
    traceContext: extractTraceContext(),
  };

  return await fileProcessingQueue.add("file-download", jobData, {
    priority,
    jobId: `file-download-${data.connectorId}-${data.externalId}`,
  });
}

export async function addFileParseJob(
  data: Omit<FileProcessingJobData, "type" | "traceContext">,
  priority = 5
) {
  const jobData: FileProcessingJobData = {
    ...data,
    type: "parse",
    traceContext: extractTraceContext(),
  };

  return await fileProcessingQueue.add("file-parse", jobData, {
    priority,
    jobId: `file-parse-${data.connectorId}-${data.externalId}`,
  });
}

export async function addFileIndexJob(
  data: Omit<FileProcessingJobData, "type" | "traceContext">,
  priority = 5
) {
  const jobData: FileProcessingJobData = {
    ...data,
    type: "index",
    traceContext: extractTraceContext(),
  };

  return await fileProcessingQueue.add("file-index", jobData, {
    priority,
    jobId: `file-index-${data.connectorId}-${data.externalId}`,
  });
}

export async function getFileProcessingJob(jobId: string) {
  return await fileProcessingQueue.getJob(jobId);
}

export async function getFileProcessingQueueMetrics() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    fileProcessingQueue.getWaitingCount(),
    fileProcessingQueue.getActiveCount(),
    fileProcessingQueue.getCompletedCount(),
    fileProcessingQueue.getFailedCount(),
    fileProcessingQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

export async function closeFileProcessingQueue(): Promise<void> {
  await fileProcessingQueue.close();
}
