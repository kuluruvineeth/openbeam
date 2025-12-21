import { Queue } from "bullmq";
import { getSharedBullMqConnection } from "../client";
import { extractTraceContext, type TraceContext } from "../utils/trace-context";

const MEDIA_JOB_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_BACKOFF_MS: 10_000,
  COMPLETED_RETENTION_COUNT: 500,
  COMPLETED_RETENTION_AGE_SECONDS: 24 * 60 * 60,
  FAILED_RETENTION_COUNT: 1000,
  DEFAULT_PRIORITY: 5,
} as const;

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

export type QueueMediaInputType = "video" | "audio";

export type MediaProcessingJobType =
  | "download"
  | "index-twelvelabs"
  | "index-vespa"
  | "process"
  | "index";

export type MediaDownloadMetadata =
  | { connector: "slack"; sourceUrl: string }
  | { connector: "gmail"; messageId: string; attachmentId: string }
  | { connector: "google-drive"; fileId: string; exportMimeType?: string };

export interface MediaDownloadJobData {
  type: "download";
  mediaId: string;
  mediaType: QueueMediaInputType;
  connectorId: string;
  externalId: string;
  /** @deprecated Use downloadMetadata instead */
  sourceUrl?: string;
  downloadMetadata?: MediaDownloadMetadata;
  mimeType: string;
  fileName: string;
  storageKey: string;
  sourceChannelId?: string;
  sourceChannelName?: string;
  sourcePermalink?: string;
  authorId?: string;
  authorName?: string;
  traceContext?: TraceContext;
}

export interface MediaTwelveLabsJobData {
  type: "index-twelvelabs";
  mediaId: string;
  mediaType: QueueMediaInputType;
  mimeType: string;
  connectorId: string;
  teamId: string;
  storageKey: string;
  originalAudioStorageKey?: string;
  originalAudioMimeType?: string;
  sourceChannelId?: string;
  sourceChannelName?: string;
  sourcePermalink?: string;
  authorId?: string;
  authorName?: string;
  traceContext?: TraceContext;
}

export interface MediaVespaJobData {
  type: "index-vespa";
  mediaId: string;
  mediaType: QueueMediaInputType;
  mimeType: string;
  connectorId: string;
  teamId: string;
  externalId: string;
  twelveLabsIndexId?: string;
  twelveLabsAssetId?: string;
  storageKey: string;
  originalAudioStorageKey?: string;
  originalAudioMimeType?: string;
  fileName: string;
  sourceChannelId?: string;
  sourceChannelName?: string;
  sourceUrl?: string;
  authorId?: string;
  authorName?: string;
  traceContext?: TraceContext;
}

export interface QueueMediaJobData {
  type: MediaProcessingJobType;
  mediaId: string;
  mediaType: QueueMediaInputType;
  mediaUrl: string;
  teamId: string;
  connectorId: string;
  externalId: string;
  title?: string;
  description?: string;
  sourceId?: string;
  sourceName?: string;
  sourceType?: string;
  authorId?: string;
  authorName?: string;
  accessControl?: string[];
  metadata?: JsonObject;
  traceContext?: TraceContext;
  twelveLabsIndexId?: string;
}

export type AnyMediaJobData =
  | MediaDownloadJobData
  | MediaTwelveLabsJobData
  | MediaVespaJobData
  | QueueMediaJobData;

export const mediaProcessingQueue = new Queue<AnyMediaJobData>(
  "media-processing",
  {
    connection: getSharedBullMqConnection(),
    defaultJobOptions: {
      attempts: MEDIA_JOB_CONFIG.MAX_ATTEMPTS,
      backoff: {
        type: "exponential",
        delay: MEDIA_JOB_CONFIG.INITIAL_BACKOFF_MS,
      },
      removeOnComplete: {
        count: MEDIA_JOB_CONFIG.COMPLETED_RETENTION_COUNT,
        age: MEDIA_JOB_CONFIG.COMPLETED_RETENTION_AGE_SECONDS,
      },
      removeOnFail: {
        count: MEDIA_JOB_CONFIG.FAILED_RETENTION_COUNT,
      },
    },
  }
);

export async function addMediaDownloadJob(
  data: Omit<MediaDownloadJobData, "type" | "traceContext">,
  priority: number = MEDIA_JOB_CONFIG.DEFAULT_PRIORITY
) {
  const jobData: MediaDownloadJobData = {
    ...data,
    type: "download",
    traceContext: extractTraceContext(),
  };

  return await mediaProcessingQueue.add("media-download", jobData, {
    priority,
    jobId: `media-download-${data.connectorId}-${data.externalId}`,
  });
}

export async function addMediaTwelveLabsJob(
  data: Omit<MediaTwelveLabsJobData, "type" | "traceContext">,
  priority: number = MEDIA_JOB_CONFIG.DEFAULT_PRIORITY
) {
  const jobData: MediaTwelveLabsJobData = {
    ...data,
    type: "index-twelvelabs",
    traceContext: extractTraceContext(),
  };

  return await mediaProcessingQueue.add("media-twelvelabs", jobData, {
    priority,
    jobId: `media-twelvelabs-${data.connectorId}-${data.mediaId}`,
  });
}

export async function addMediaVespaJob(
  data: Omit<MediaVespaJobData, "type" | "traceContext">,
  priority: number = MEDIA_JOB_CONFIG.DEFAULT_PRIORITY
) {
  const jobData: MediaVespaJobData = {
    ...data,
    type: "index-vespa",
    traceContext: extractTraceContext(),
  };

  return await mediaProcessingQueue.add("media-vespa", jobData, {
    priority,
    jobId: `media-vespa-${data.connectorId}-${data.mediaId}`,
  });
}

export async function addMediaProcessJob(
  data: Omit<QueueMediaJobData, "type" | "traceContext">,
  priority: number = MEDIA_JOB_CONFIG.DEFAULT_PRIORITY
) {
  const jobData: QueueMediaJobData = {
    ...data,
    type: "process",
    traceContext: extractTraceContext(),
  };

  return await mediaProcessingQueue.add("media-process", jobData, {
    priority,
    jobId: `media-process-${data.connectorId}-${data.externalId}`,
  });
}

export async function addMediaIndexJob(
  data: Omit<QueueMediaJobData, "type" | "traceContext">,
  priority: number = MEDIA_JOB_CONFIG.DEFAULT_PRIORITY
) {
  const jobData: QueueMediaJobData = {
    ...data,
    type: "index",
    traceContext: extractTraceContext(),
  };

  return await mediaProcessingQueue.add("media-index", jobData, {
    priority,
    jobId: `media-index-${data.connectorId}-${data.externalId}`,
  });
}

export async function getMediaProcessingJob(jobId: string) {
  return await mediaProcessingQueue.getJob(jobId);
}

export async function getMediaProcessingQueueMetrics() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    mediaProcessingQueue.getWaitingCount(),
    mediaProcessingQueue.getActiveCount(),
    mediaProcessingQueue.getCompletedCount(),
    mediaProcessingQueue.getFailedCount(),
    mediaProcessingQueue.getDelayedCount(),
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

export async function closeMediaProcessingQueue(): Promise<void> {
  await mediaProcessingQueue.close();
}
