import prisma, { decryptIfEncrypted, type OAuthProvider } from "@openplane/db";
import {
  type AnyVideoJobData,
  addVideoTwelveLabsJob,
  addVideoVespaJob,
  createLinkedSpan,
  type VideoDownloadJobData,
  type VideoProcessingJobData,
  type VideoTwelveLabsJobData,
  type VideoVespaJobData,
} from "@openplane/redis";
import {
  getStorageProvider,
  SIGNED_URL_EXPIRY_SECONDS,
  videoIndexService,
} from "@openplane/services";
import { type VideoDocument, vespaClient } from "@openplane/vespa";
import { TwelveLabsClient, type VideoSegment } from "@openplane/video";
import { SpanStatusCode } from "@opentelemetry/api";
import type { Job } from "bullmq";
import logger from "../../utils/logger";
import { logJobError, logJobStart } from "../event-handlers";

const THUMBNAIL_FETCH_TIMEOUT_MS = 10_000;

async function uploadThumbnailToStorage(
  thumbnailUrl: string,
  teamId: string,
  videoId: string
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    THUMBNAIL_FETCH_TIMEOUT_MS
  );

  try {
    const response = await fetch(thumbnailUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch thumbnail: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const extension = contentType.includes("png") ? "png" : "jpeg";
    const storageKey = `thumbnails/${teamId}/${videoId}.${extension}`;

    await getStorageProvider().upload(storageKey, buffer, { contentType });

    return storageKey;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface VideoProcessingResult {
  success: boolean;
  videoId: string;
  vespaId?: string;
}

export async function processVideoJob(
  job: Job<AnyVideoJobData>
): Promise<VideoProcessingResult> {
  const { type, videoId, connectorId } = job.data;
  const traceContext =
    "traceContext" in job.data ? job.data.traceContext : undefined;

  const span = createLinkedSpan(
    "openplane-worker",
    `video-processor.${type}`,
    traceContext,
    {
      "job.id": job.id || "",
      "video.id": videoId,
      "connector.id": connectorId,
      "video.type": type,
    }
  );

  try {
    logJobStart(`video-${type}`, job.id, { connectorId, videoId });

    let result: VideoProcessingResult;

    switch (type) {
      case "download":
        result = await processVideoDownload(job.data as VideoDownloadJobData);
        break;
      case "index-twelvelabs":
        result = await processTwelveLabsIndexing(
          job.data as VideoTwelveLabsJobData
        );
        break;
      case "index-vespa":
        result = await processVespaIndexing(job.data as VideoVespaJobData);
        break;
      case "process":
      case "index":
        result = await processVideoLegacy(job.data as VideoProcessingJobData);
        break;
      default:
        throw new Error(`Unknown video processing type: ${type}`);
    }

    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);
    logJobError(`video-${type}`, job.id, error, { connectorId, videoId });

    await prisma.indexedVideo.update({
      where: { id: videoId },
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

async function processVideoDownload(
  data: VideoDownloadJobData
): Promise<VideoProcessingResult> {
  const { videoId, connectorId, sourceUrl, fileName, externalId } = data;

  const storage = getStorageProvider();

  const connector = await prisma.connector.findUnique({
    where: { id: connectorId },
    include: { oauthProvider: true },
  });

  if (!connector) {
    throw new Error("Connector not found");
  }

  const oauth: OAuthProvider | null | undefined = connector.oauthProvider;
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

  await prisma.indexedVideo.update({
    where: { id: videoId },
    data: { processingStatus: "DOWNLOADING" },
  });

  const response = await fetch(sourceUrl, {
    headers: { Authorization: `Bearer ${downloadToken}` },
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const content = await response.arrayBuffer();
  const buffer = Buffer.from(content);

  const finalStorageKey = `${connector.teamId}/${connectorId}/videos/${externalId}/${fileName}`;

  await storage.upload(finalStorageKey, buffer, {
    contentType: data.mimeType,
  });

  await prisma.indexedVideo.update({
    where: { id: videoId },
    data: {
      processingStatus: "DOWNLOADED",
      storageKey: finalStorageKey,
      uploadedAt: new Date(),
    },
  });

  logger.info({ videoId, storageKey: finalStorageKey }, "Video downloaded");

  await addVideoTwelveLabsJob({
    videoId,
    connectorId,
    teamId: connector.teamId,
    storageKey: finalStorageKey,
  });

  return { success: true, videoId };
}

async function processTwelveLabsIndexing(
  data: VideoTwelveLabsJobData
): Promise<VideoProcessingResult> {
  const { videoId, connectorId, teamId, storageKey } = data;

  await prisma.indexedVideo.update({
    where: { id: videoId },
    data: { processingStatus: "INDEXING_TWELVELABS" },
  });

  const twelveLabsIndexId =
    await videoIndexService.getOrCreateTeamIndex(teamId);

  const signedUrl = await getStorageProvider().getSignedUrl(
    storageKey,
    SIGNED_URL_EXPIRY_SECONDS
  );

  const client = new TwelveLabsClient();
  const twelveLabsVideoId = await client.indexVideo(
    twelveLabsIndexId,
    signedUrl,
    {
      enableVideoStream: true,
    }
  );

  await prisma.indexedVideo.update({
    where: { id: videoId },
    data: {
      processingStatus: "INDEXED_TWELVELABS",
      twelveLabsIndexId,
      twelveLabsVideoId,
    },
  });

  logger.info({ videoId, twelveLabsVideoId }, "Video indexed in TwelveLabs");

  const video = await prisma.indexedVideo.findUnique({
    where: { id: videoId },
  });

  await addVideoVespaJob({
    videoId,
    connectorId,
    teamId,
    externalId: video?.externalId ?? "",
    twelveLabsIndexId,
    twelveLabsVideoId,
    storageKey,
    fileName: video?.fileName ?? "",
    sourceChannelId: video?.sourceChannelId ?? undefined,
  });

  return { success: true, videoId };
}

async function processVespaIndexing(
  data: VideoVespaJobData
): Promise<VideoProcessingResult> {
  const {
    videoId,
    connectorId,
    teamId,
    externalId,
    twelveLabsIndexId,
    twelveLabsVideoId,
    storageKey,
    fileName,
    sourceChannelId,
  } = data;

  await prisma.indexedVideo.update({
    where: { id: videoId },
    data: { processingStatus: "GENERATING_EMBEDDINGS" },
  });

  const client = new TwelveLabsClient();
  const signedUrl = await getStorageProvider().getSignedUrl(
    storageKey,
    SIGNED_URL_EXPIRY_SECONDS
  );

  const [{ segments, videoEmbedding }, metadata, transcriptSegments] =
    await Promise.all([
      client.generateEmbeddingsAsync(signedUrl),
      client.generateMetadata(twelveLabsIndexId, twelveLabsVideoId),
      client.getVideoTranscriptWithTimestamps(
        twelveLabsIndexId,
        twelveLabsVideoId
      ),
    ]);

  let thumbnailStorageKey: string | undefined;
  if (metadata.thumbnailUrl) {
    try {
      thumbnailStorageKey = await uploadThumbnailToStorage(
        metadata.thumbnailUrl,
        teamId,
        videoId
      );
    } catch (error) {
      logger.warn({ videoId, error }, "Failed to upload thumbnail to storage");
    }
  }

  logger.info(
    {
      videoId,
      segmentCount: segments.length,
      duration: metadata.duration,
      transcriptSegments: transcriptSegments.length,
      hasThumbnail: !!thumbnailStorageKey,
    },
    "Generated video embeddings, metadata, and transcript"
  );

  await prisma.indexedVideo.update({
    where: { id: videoId },
    data: {
      processingStatus: "INDEXING_VESPA",
      durationSeconds: Math.round(metadata.duration),
    },
  });

  const segmentEmbeddings: Record<string, number[]> = {};
  const segmentTimestamps: Record<string, [number, number]> = {};

  for (const segment of segments) {
    segmentEmbeddings[segment.segmentId] = segment.embedding;
    segmentTimestamps[segment.segmentId] = [segment.startTime, segment.endTime];
  }

  const now = Date.now();
  const vespaId = `video_${connectorId}_${externalId}`;

  const connector = await prisma.connector.findUnique({
    where: { id: connectorId },
  });

  const connectorType = connector?.app.toLowerCase();

  const videoDoc: VideoDocument = {
    id: vespaId,
    team_id: teamId,
    connector_id: connectorId,
    connector_type: connectorType,
    external_id: externalId,
    title: fileName,
    description: metadata.summary,
    video_summary: metadata.summary,
    video_keywords: metadata.keywords,
    duration_seconds: metadata.duration,
    segment_count: segments.length,
    segment_embeddings: segmentEmbeddings,
    segment_timestamps: segmentTimestamps,
    transcript_embedding: videoEmbedding,
    source_id: sourceChannelId,
    source_name: sourceChannelId,
    source_type: connectorType,
    url: signedUrl,
    created_at: now,
    updated_at: now,
    indexed_at: now,
    access_control: [`team:${teamId}`],
    is_public: false,
    chapters: metadata.chapters?.map((c) => JSON.stringify(c)),
    highlights: metadata.highlights?.map((h) => JSON.stringify(h)),
    transcript_segments: transcriptSegments.map((s) => JSON.stringify(s)),
    metadata: {
      twelveLabsIndexId,
      twelveLabsVideoId,
      storageKey,
      ...(thumbnailStorageKey && { thumbnailStorageKey }),
    },
  };

  await vespaClient.feedVideoDocument(videoDoc);

  await prisma.indexedVideo.update({
    where: { id: videoId },
    data: {
      processingStatus: "INDEXED",
      vespaId,
      indexedAt: new Date(),
    },
  });

  logger.info(
    { videoId, vespaId, segmentCount: segments.length },
    "Video indexed in Vespa"
  );

  return { success: true, videoId, vespaId };
}

async function generateVideoEmbeddings(
  videoUrl: string
): Promise<{ segments: VideoSegment[]; duration: number }> {
  const client = new TwelveLabsClient();
  const { segments } = await client.generateEmbeddings(videoUrl);

  const lastSegment = segments.at(-1);
  const duration = lastSegment?.endTime ?? 0;

  return { segments, duration };
}

async function processVideoLegacy(
  data: VideoProcessingJobData
): Promise<VideoProcessingResult> {
  const {
    videoId,
    videoUrl,
    teamId,
    connectorId,
    externalId,
    title,
    description,
    sourceId,
    sourceName,
    sourceType,
    authorId,
    authorName,
    accessControl,
    metadata,
  } = data;

  logger.info({ videoId, videoUrl }, "Processing video (legacy)");

  const [{ segments, duration }, connector] = await Promise.all([
    generateVideoEmbeddings(videoUrl),
    prisma.connector.findUnique({ where: { id: connectorId } }),
  ]);

  const segmentEmbeddings: Record<string, number[]> = {};
  const segmentTimestamps: Record<string, [number, number]> = {};

  for (const segment of segments) {
    segmentEmbeddings[segment.segmentId] = segment.embedding;
    segmentTimestamps[segment.segmentId] = [segment.startTime, segment.endTime];
  }

  const now = Date.now();
  const vespaId = `video_${connectorId}_${externalId}`;
  const connectorType = connector?.app.toLowerCase() ?? sourceType;

  const videoDoc: VideoDocument = {
    id: vespaId,
    team_id: teamId,
    connector_id: connectorId,
    connector_type: connectorType,
    external_id: externalId,
    title: title || "Untitled Video",
    description,
    video_summary: "",
    video_keywords: [],
    duration_seconds: duration,
    segment_count: segments.length,
    segment_embeddings: segmentEmbeddings,
    segment_timestamps: segmentTimestamps,
    source_id: sourceId,
    source_name: sourceName,
    source_type: sourceType ?? connectorType,
    url: videoUrl,
    author_id: authorId,
    author_name: authorName,
    created_at: now,
    updated_at: now,
    indexed_at: now,
    access_control: accessControl || [`team:${teamId}`],
    is_public: false,
    metadata: metadata as VideoDocument["metadata"],
  };

  await vespaClient.feedVideoDocument(videoDoc);

  logger.info(
    { videoId, vespaId, segmentCount: segments.length },
    "Video indexed (legacy)"
  );

  return { success: true, videoId, vespaId };
}
