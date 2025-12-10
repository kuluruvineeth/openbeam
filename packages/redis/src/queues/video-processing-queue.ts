import { Queue } from "bullmq";
import { getSharedBullMqConnection } from "../client";
import { extractTraceContext, type TraceContext } from "../utils/trace-context";

const VIDEO_JOB_CONFIG = {
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

export type VideoProcessingJobType =
  | "download"
  | "index-twelvelabs"
  | "index-vespa"
  | "process"
  | "index";

export interface VideoDownloadJobData {
  type: "download";
  videoId: string;
  connectorId: string;
  externalId: string;
  sourceUrl: string;
  mimeType: string;
  fileName: string;
  storageKey: string;
  traceContext?: TraceContext;
}

export interface VideoTwelveLabsJobData {
  type: "index-twelvelabs";
  videoId: string;
  connectorId: string;
  teamId: string;
  storageKey: string;
  traceContext?: TraceContext;
}

export interface VideoVespaJobData {
  type: "index-vespa";
  videoId: string;
  connectorId: string;
  teamId: string;
  externalId: string;
  twelveLabsIndexId: string;
  twelveLabsVideoId: string;
  storageKey: string;
  fileName: string;
  sourceChannelId?: string;
  traceContext?: TraceContext;
}

export interface VideoProcessingJobData {
  type: VideoProcessingJobType;
  videoId: string;
  videoUrl: string;
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

export type AnyVideoJobData =
  | VideoDownloadJobData
  | VideoTwelveLabsJobData
  | VideoVespaJobData
  | VideoProcessingJobData;

export const videoProcessingQueue = new Queue<AnyVideoJobData>(
  "video-processing",
  {
    connection: getSharedBullMqConnection(),
    defaultJobOptions: {
      attempts: VIDEO_JOB_CONFIG.MAX_ATTEMPTS,
      backoff: {
        type: "exponential",
        delay: VIDEO_JOB_CONFIG.INITIAL_BACKOFF_MS,
      },
      removeOnComplete: {
        count: VIDEO_JOB_CONFIG.COMPLETED_RETENTION_COUNT,
        age: VIDEO_JOB_CONFIG.COMPLETED_RETENTION_AGE_SECONDS,
      },
      removeOnFail: {
        count: VIDEO_JOB_CONFIG.FAILED_RETENTION_COUNT,
      },
    },
  }
);

export async function addVideoDownloadJob(
  data: Omit<VideoDownloadJobData, "type" | "traceContext">,
  priority = VIDEO_JOB_CONFIG.DEFAULT_PRIORITY
) {
  const jobData: VideoDownloadJobData = {
    ...data,
    type: "download",
    traceContext: extractTraceContext(),
  };

  return await videoProcessingQueue.add("video-download", jobData, {
    priority,
    jobId: `video-download-${data.connectorId}-${data.externalId}`,
  });
}

export async function addVideoTwelveLabsJob(
  data: Omit<VideoTwelveLabsJobData, "type" | "traceContext">,
  priority = VIDEO_JOB_CONFIG.DEFAULT_PRIORITY
) {
  const jobData: VideoTwelveLabsJobData = {
    ...data,
    type: "index-twelvelabs",
    traceContext: extractTraceContext(),
  };

  return await videoProcessingQueue.add("video-twelvelabs", jobData, {
    priority,
    jobId: `video-twelvelabs-${data.connectorId}-${data.videoId}`,
  });
}

export async function addVideoVespaJob(
  data: Omit<VideoVespaJobData, "type" | "traceContext">,
  priority = VIDEO_JOB_CONFIG.DEFAULT_PRIORITY
) {
  const jobData: VideoVespaJobData = {
    ...data,
    type: "index-vespa",
    traceContext: extractTraceContext(),
  };

  return await videoProcessingQueue.add("video-vespa", jobData, {
    priority,
    jobId: `video-vespa-${data.connectorId}-${data.videoId}`,
  });
}

export async function addVideoProcessJob(
  data: Omit<VideoProcessingJobData, "type" | "traceContext">,
  priority = VIDEO_JOB_CONFIG.DEFAULT_PRIORITY
) {
  const jobData: VideoProcessingJobData = {
    ...data,
    type: "process",
    traceContext: extractTraceContext(),
  };

  return await videoProcessingQueue.add("video-process", jobData, {
    priority,
    jobId: `video-process-${data.connectorId}-${data.externalId}`,
  });
}

export async function addVideoIndexJob(
  data: Omit<VideoProcessingJobData, "type" | "traceContext">,
  priority = VIDEO_JOB_CONFIG.DEFAULT_PRIORITY
) {
  const jobData: VideoProcessingJobData = {
    ...data,
    type: "index",
    traceContext: extractTraceContext(),
  };

  return await videoProcessingQueue.add("video-index", jobData, {
    priority,
    jobId: `video-index-${data.connectorId}-${data.externalId}`,
  });
}

export async function getVideoProcessingJob(jobId: string) {
  return await videoProcessingQueue.getJob(jobId);
}

export async function getVideoProcessingQueueMetrics() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    videoProcessingQueue.getWaitingCount(),
    videoProcessingQueue.getActiveCount(),
    videoProcessingQueue.getCompletedCount(),
    videoProcessingQueue.getFailedCount(),
    videoProcessingQueue.getDelayedCount(),
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

export async function closeVideoProcessingQueue(): Promise<void> {
  await videoProcessingQueue.close();
}
