import prisma, { decryptIfEncrypted, type OAuthProvider } from "@openplane/db";
import {
  type MediaInputType,
  type MediaSegment,
  TwelveLabsClient,
} from "@openplane/media";
import {
  type AnyMediaJobData,
  addMediaTwelveLabsJob,
  addMediaVespaJob,
  createLinkedSpan,
  type MediaDownloadJobData,
  type MediaProcessingJobData,
  type MediaTwelveLabsJobData,
  type MediaVespaJobData,
} from "@openplane/redis";
import {
  getStorageProvider,
  mediaIndexService,
  SIGNED_URL_EXPIRY_SECONDS,
} from "@openplane/services";
import { type MediaDocument, vespaClient } from "@openplane/vespa";
import { SpanStatusCode } from "@opentelemetry/api";
import type { Job } from "bullmq";
import { prepareAudioAsVideo } from "../../utils/audio-converter";
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

export interface MediaProcessingResult {
  success: boolean;
  mediaId: string;
  vespaId?: string;
}

export async function processMediaJob(
  job: Job<AnyMediaJobData>
): Promise<MediaProcessingResult> {
  const { type, mediaId, connectorId } = job.data;
  const traceContext =
    "traceContext" in job.data ? job.data.traceContext : undefined;

  const span = createLinkedSpan(
    "openplane-worker",
    `media-processor.${type}`,
    traceContext,
    {
      "job.id": job.id || "",
      "media.id": mediaId,
      "connector.id": connectorId,
      "media.type": type,
    }
  );

  try {
    logJobStart(`media-${type}`, job.id, { connectorId, mediaId });

    let result: MediaProcessingResult;

    switch (type) {
      case "download":
        result = await processMediaDownload(job.data as MediaDownloadJobData);
        break;
      case "index-twelvelabs":
        result = await processTwelveLabsIndexing(
          job.data as MediaTwelveLabsJobData
        );
        break;
      case "index-vespa":
        result = await processVespaIndexing(job.data as MediaVespaJobData);
        break;
      case "process":
      case "index":
        result = await processMediaLegacy(job.data as MediaProcessingJobData);
        break;
      default:
        throw new Error(`Unknown media processing type: ${type}`);
    }

    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);
    logJobError(`media-${type}`, job.id, error, { connectorId, mediaId });

    await prisma.indexedMedia.update({
      where: { id: mediaId },
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

async function processMediaDownload(
  data: MediaDownloadJobData
): Promise<MediaProcessingResult> {
  const {
    mediaId,
    connectorId,
    sourceUrl,
    fileName,
    externalId,
    mimeType,
    mediaType,
  } = data;

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

  await prisma.indexedMedia.update({
    where: { id: mediaId },
    data: { processingStatus: "DOWNLOADING" },
  });

  const response = await fetch(sourceUrl, {
    headers: { Authorization: `Bearer ${downloadToken}` },
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const content = await response.arrayBuffer();
  const rawBuffer = Buffer.from(content);

  const {
    buffer: finalBuffer,
    mimeType: finalMimeType,
    fileName: finalFileName,
  } = mediaType === "audio"
    ? await prepareAudioAsVideo(rawBuffer, fileName)
    : { buffer: rawBuffer, mimeType, fileName };

  const finalStorageKey = `${connector.teamId}/${connectorId}/videos/${externalId}/${finalFileName}`;

  await storage.upload(finalStorageKey, finalBuffer, {
    contentType: finalMimeType,
  });

  await prisma.indexedMedia.update({
    where: { id: mediaId },
    data: {
      processingStatus: "DOWNLOADED",
      storageKey: finalStorageKey,
      uploadedAt: new Date(),
    },
  });

  logger.info(
    { mediaId, mediaType, storageKey: finalStorageKey },
    "Media downloaded"
  );

  await addMediaTwelveLabsJob({
    mediaId,
    connectorId,
    teamId: connector.teamId,
    storageKey: finalStorageKey,
    mediaType,
    mimeType: finalMimeType,
  });

  return { success: true, mediaId };
}

async function processTwelveLabsIndexing(
  data: MediaTwelveLabsJobData
): Promise<MediaProcessingResult> {
  const { mediaId, connectorId, teamId, storageKey, mediaType, mimeType } =
    data;

  await prisma.indexedMedia.update({
    where: { id: mediaId },
    data: { processingStatus: "INDEXING_TWELVELABS" },
  });

  const twelveLabsIndexId =
    await mediaIndexService.getOrCreateTeamIndex(teamId);

  const signedUrl = await getStorageProvider().getSignedUrl(
    storageKey,
    SIGNED_URL_EXPIRY_SECONDS
  );

  const client = new TwelveLabsClient();
  const twelveLabsAssetId = await client.indexVideo(
    twelveLabsIndexId,
    signedUrl,
    {
      enableVideoStream: true,
    }
  );

  await prisma.indexedMedia.update({
    where: { id: mediaId },
    data: {
      processingStatus: "INDEXED_TWELVELABS",
      twelveLabsIndexId,
      twelveLabsAssetId,
    },
  });

  logger.info(
    { mediaId, mediaType, twelveLabsAssetId },
    "Media indexed in TwelveLabs"
  );

  const media = await prisma.indexedMedia.findUnique({
    where: { id: mediaId },
  });

  await addMediaVespaJob({
    mediaId,
    connectorId,
    teamId,
    externalId: media?.externalId ?? "",
    twelveLabsIndexId,
    twelveLabsAssetId,
    storageKey,
    fileName: media?.fileName ?? "",
    sourceChannelId: media?.sourceChannelId ?? undefined,
    mediaType,
    mimeType,
  });

  return { success: true, mediaId };
}

async function processVespaIndexing(
  data: MediaVespaJobData
): Promise<MediaProcessingResult> {
  const {
    mediaId,
    connectorId,
    teamId,
    externalId,
    twelveLabsIndexId,
    twelveLabsAssetId,
    storageKey,
    fileName,
    sourceChannelId,
    mediaType,
  } = data;

  await prisma.indexedMedia.update({
    where: { id: mediaId },
    data: { processingStatus: "GENERATING_EMBEDDINGS" },
  });

  const client = new TwelveLabsClient();
  const signedUrl = await getStorageProvider().getSignedUrl(
    storageKey,
    SIGNED_URL_EXPIRY_SECONDS
  );

  const [{ segments, mediaEmbedding }, metadata, transcriptSegments] =
    await Promise.all([
      client.generateEmbeddingsAsync(signedUrl, { inputType: "video" }),
      client.generateMetadata(twelveLabsIndexId, twelveLabsAssetId),
      client.getVideoTranscriptWithTimestamps(
        twelveLabsIndexId,
        twelveLabsAssetId
      ),
    ]);

  let thumbnailStorageKey: string | undefined;
  if (mediaType !== "audio" && metadata.thumbnailUrl) {
    try {
      thumbnailStorageKey = await uploadThumbnailToStorage(
        metadata.thumbnailUrl,
        teamId,
        mediaId
      );
    } catch (error) {
      logger.warn({ mediaId, error }, "Failed to upload thumbnail to storage");
    }
  }

  logger.info(
    {
      mediaId,
      mediaType,
      segmentCount: segments.length,
      duration: metadata.duration,
      transcriptSegments: transcriptSegments.length,
      hasThumbnail: !!thumbnailStorageKey,
    },
    "Generated media embeddings, metadata, and transcript"
  );

  await prisma.indexedMedia.update({
    where: { id: mediaId },
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
  const vespaId = `media_${connectorId}_${externalId}`;

  const connector = await prisma.connector.findUnique({
    where: { id: connectorId },
  });

  const connectorType = connector?.app.toLowerCase();

  const mediaDoc: MediaDocument = {
    id: vespaId,
    team_id: teamId,
    connector_id: connectorId,
    connector_type: connectorType,
    external_id: externalId,
    title: fileName,
    description: metadata.summary,
    media_summary: metadata.summary,
    media_keywords: metadata.keywords,
    duration_seconds: metadata.duration,
    segment_count: segments.length,
    segment_embeddings: segmentEmbeddings,
    segment_timestamps: segmentTimestamps,
    transcript_embedding: mediaEmbedding,
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
      twelveLabsAssetId,
      storageKey,
      mediaType,
      ...(thumbnailStorageKey && { thumbnailStorageKey }),
    },
  };

  await vespaClient.feedMediaDocument(mediaDoc);

  await prisma.indexedMedia.update({
    where: { id: mediaId },
    data: {
      processingStatus: "INDEXED",
      vespaId,
      indexedAt: new Date(),
    },
  });

  logger.info(
    { mediaId, mediaType, vespaId, segmentCount: segments.length },
    "Media indexed in Vespa"
  );

  return { success: true, mediaId, vespaId };
}

async function generateMediaEmbeddings(
  mediaUrl: string,
  inputType: MediaInputType = "video"
): Promise<{ segments: MediaSegment[]; duration: number }> {
  const client = new TwelveLabsClient();
  const { segments } = await client.generateEmbeddings(mediaUrl, { inputType });

  const lastSegment = segments.at(-1);
  const duration = lastSegment?.endTime ?? 0;

  return { segments, duration };
}

async function processMediaLegacy(
  data: MediaProcessingJobData
): Promise<MediaProcessingResult> {
  const {
    mediaId,
    mediaUrl,
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
    mediaType,
  } = data;

  const inputType: MediaInputType = mediaType === "audio" ? "audio" : "video";

  logger.info({ mediaId, mediaUrl, mediaType }, "Processing media (legacy)");

  const [{ segments, duration }, connector] = await Promise.all([
    generateMediaEmbeddings(mediaUrl, inputType),
    prisma.connector.findUnique({ where: { id: connectorId } }),
  ]);

  const segmentEmbeddings: Record<string, number[]> = {};
  const segmentTimestamps: Record<string, [number, number]> = {};

  for (const segment of segments) {
    segmentEmbeddings[segment.segmentId] = segment.embedding;
    segmentTimestamps[segment.segmentId] = [segment.startTime, segment.endTime];
  }

  const now = Date.now();
  const vespaId = `media_${connectorId}_${externalId}`;
  const connectorType = connector?.app.toLowerCase() ?? sourceType;

  const mediaDoc: MediaDocument = {
    id: vespaId,
    team_id: teamId,
    connector_id: connectorId,
    connector_type: connectorType,
    external_id: externalId,
    title:
      title || (mediaType === "audio" ? "Untitled Audio" : "Untitled Video"),
    description,
    media_summary: "",
    media_keywords: [],
    duration_seconds: duration,
    segment_count: segments.length,
    segment_embeddings: segmentEmbeddings,
    segment_timestamps: segmentTimestamps,
    source_id: sourceId,
    source_name: sourceName,
    source_type: sourceType ?? connectorType,
    url: mediaUrl,
    author_id: authorId,
    author_name: authorName,
    created_at: now,
    updated_at: now,
    indexed_at: now,
    access_control: accessControl || [`team:${teamId}`],
    is_public: false,
    metadata: { ...metadata, mediaType } as MediaDocument["metadata"],
  };

  await vespaClient.feedMediaDocument(mediaDoc);

  logger.info(
    { mediaId, mediaType, vespaId, segmentCount: segments.length },
    "Media indexed (legacy)"
  );

  return { success: true, mediaId, vespaId };
}
