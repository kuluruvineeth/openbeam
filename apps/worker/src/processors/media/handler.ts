import prisma, {
  decryptIfEncrypted,
  findConnectorById,
  findIndexedMediaById,
  getConnectorForSync,
  type OAuthProvider,
  updateIndexedMediaDownloaded,
  updateIndexedMediaIndexed,
  updateIndexedMediaProcessingStatus,
  updateIndexedMediaStatus,
  updateIndexedMediaTwelveLabs,
} from "@openplane/db";
import {
  type MediaChapter,
  type MediaHighlight,
  type MediaInputType,
  type MediaSegment,
  TwelveLabsClient,
} from "@openplane/media";
import {
  type AnyMediaJobData,
  addMediaTwelveLabsJob,
  addMediaVespaJob,
  createLinkedSpan,
  createProgressEmitter,
  type MediaDownloadJobData,
  type MediaTwelveLabsJobData,
  type MediaVespaJobData,
  type QueueMediaJobData,
} from "@openplane/redis";
import {
  createSlackClient,
  getChannelInfo,
  getStorageProvider,
  mediaIndexService,
  SIGNED_URL_EXPIRY_SECONDS,
} from "@openplane/services";
import { type MediaDocument, vespaClient } from "@openplane/vespa";
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

type ConnectorWithOAuth = Awaited<
  ReturnType<typeof findConnectorById>
> extends infer T
  ? T & { oauthProvider?: { accessToken: string; accessTokenIv?: string } }
  : never;

const CONNECTOR_TYPE_LABELS: Record<string, string> = {
  slack: "Slack",
  google_drive: "Google Drive",
  gmail: "Gmail",
  notion: "Notion",
  confluence: "Confluence",
  jira: "Jira",
};

async function resolveSourceName(
  connector: ConnectorWithOAuth | null,
  channelId: string | undefined,
  providedName: string | undefined
): Promise<string | undefined> {
  if (providedName) {
    return providedName;
  }

  if (!(connector && channelId)) {
    return connector?.app
      ? CONNECTOR_TYPE_LABELS[connector.app.toLowerCase()]
      : undefined;
  }

  const isSlack = connector.app.toLowerCase() === "slack";
  if (!isSlack) {
    return CONNECTOR_TYPE_LABELS[connector.app.toLowerCase()];
  }

  const oauth = connector.oauthProvider;
  if (!oauth?.accessToken) {
    return CONNECTOR_TYPE_LABELS.slack;
  }

  try {
    const token = decryptIfEncrypted(oauth.accessToken, oauth.accessTokenIv);
    const slackClient = createSlackClient({
      token: token ?? "",
      connectorId: connector.id,
      teamId: connector.teamId,
    });
    const channelInfo = await getChannelInfo(slackClient, channelId);
    if (channelInfo?.name) {
      return `#${channelInfo.name}`;
    }
  } catch (error) {
    logger.warn(
      { connectorId: connector.id, channelId, error },
      "Failed to look up channel name"
    );
  }

  return CONNECTOR_TYPE_LABELS.slack;
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
        result = await processMediaLegacy(job.data as QueueMediaJobData);
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

    await updateIndexedMediaStatus(prisma, mediaId, "FAILED", {
      lastError: error instanceof Error ? error.message : String(error),
      errorCount: { increment: 1 },
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
    sourceChannelId,
    sourceChannelName,
    slackPermalink,
  } = data;

  const storage = getStorageProvider();

  const connector = await getConnectorForSync(prisma, connectorId);

  if (!connector) {
    throw new Error("Connector not found");
  }

  const progress = createProgressEmitter({
    id: mediaId,
    teamId: connector.teamId,
    type: "media",
    connectorId,
    fileName,
  });

  await progress.start(4, "Downloading");

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

  await updateIndexedMediaProcessingStatus(prisma, mediaId, "DOWNLOADING");

  const response = await fetch(sourceUrl, {
    headers: { Authorization: `Bearer ${downloadToken}` },
  });

  if (!response.ok) {
    await progress.fail(`Download failed: ${response.status}`, 4);
    throw new Error(`Download failed: ${response.status}`);
  }

  const content = await response.arrayBuffer();
  const buffer = Buffer.from(content);

  const folder = mediaType === "audio" ? "audio" : "videos";
  const finalStorageKey = `${connector.teamId}/${connectorId}/${folder}/${externalId}/${fileName}`;

  await storage.upload(finalStorageKey, buffer, {
    contentType: mimeType,
  });

  await updateIndexedMediaDownloaded(prisma, mediaId, finalStorageKey);

  await progress.update(1, 4, "Downloaded");

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
    mimeType,
    sourceChannelId,
    sourceChannelName,
    slackPermalink,
  });

  return { success: true, mediaId };
}

async function processTwelveLabsIndexing(
  data: MediaTwelveLabsJobData
): Promise<MediaProcessingResult> {
  const {
    mediaId,
    connectorId,
    teamId,
    storageKey,
    mediaType,
    mimeType,
    sourceChannelId,
    sourceChannelName,
    slackPermalink,
  } = data;

  const media = await findIndexedMediaById(prisma, mediaId);

  const progress = createProgressEmitter({
    id: mediaId,
    teamId,
    type: "media",
    connectorId,
    fileName: media?.fileName ?? undefined,
  });

  await progress.update(1, 4, "Transcribing");

  await updateIndexedMediaProcessingStatus(
    prisma,
    mediaId,
    "INDEXING_TWELVELABS"
  );

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

  await updateIndexedMediaTwelveLabs(prisma, mediaId, {
    twelveLabsIndexId,
    twelveLabsAssetId,
  });

  await progress.update(2, 4, "Transcribed");

  logger.info(
    { mediaId, mediaType, twelveLabsAssetId },
    "Media indexed in TwelveLabs"
  );

  await addMediaVespaJob({
    mediaId,
    connectorId,
    teamId,
    externalId: media?.externalId ?? "",
    twelveLabsIndexId,
    twelveLabsAssetId,
    storageKey,
    fileName: media?.fileName ?? "",
    sourceChannelId: sourceChannelId ?? media?.sourceChannelId ?? undefined,
    sourceChannelName,
    sourceUrl: slackPermalink,
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
    sourceChannelName: providedChannelName,
    sourceUrl,
    mediaType,
  } = data;

  if (!(twelveLabsIndexId && twelveLabsAssetId)) {
    throw new Error("Missing TwelveLabs index or asset ID for Vespa indexing");
  }

  const progress = createProgressEmitter({
    id: mediaId,
    teamId,
    type: "media",
    connectorId,
    fileName,
  });

  await progress.update(2, 4, "Generating embeddings");

  await updateIndexedMediaProcessingStatus(
    prisma,
    mediaId,
    "GENERATING_EMBEDDINGS"
  );

  const client = new TwelveLabsClient();
  const signedUrl = await getStorageProvider().getSignedUrl(
    storageKey,
    SIGNED_URL_EXPIRY_SECONDS
  );

  const inputType: MediaInputType = mediaType === "audio" ? "audio" : "video";
  const isAudio = inputType === "audio";

  const [{ segments, mediaEmbedding }, metadata, transcriptSegments] =
    await Promise.all([
      client.generateEmbeddingsAsync(signedUrl, { inputType }),
      client.generateMetadata(twelveLabsIndexId, twelveLabsAssetId),
      client.getVideoTranscriptWithTimestamps(
        twelveLabsIndexId,
        twelveLabsAssetId
      ),
    ]);

  let thumbnailStorageKey: string | undefined;
  if (!isAudio && metadata.thumbnailUrl) {
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

  await progress.update(3, 4, "Indexing");

  await updateIndexedMediaProcessingStatus(prisma, mediaId, "INDEXING_VESPA", {
    durationSeconds: Math.round(metadata.duration),
  });

  const segmentEmbeddings: Record<string, number[]> = {};
  const segmentTimestamps: Record<string, [number, number]> = {};

  for (const segment of segments) {
    segmentEmbeddings[segment.segmentId] = segment.embedding;
    segmentTimestamps[segment.segmentId] = [segment.startTime, segment.endTime];
  }

  const now = Date.now();
  const vespaId = `media_${connectorId}_${externalId}`;

  const connector = await findConnectorById(prisma, connectorId, true);

  const connectorType = connector?.app.toLowerCase();

  const sourceName = await resolveSourceName(
    connector,
    sourceChannelId,
    providedChannelName
  );

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
    source_name: sourceName,
    source_type: connectorType,
    url: signedUrl,
    created_at: now,
    updated_at: now,
    indexed_at: now,
    access_control: [`team:${teamId}`],
    is_public: false,
    chapters: metadata.chapters?.map((c: MediaChapter) => JSON.stringify(c)),
    highlights: metadata.highlights?.map((h: MediaHighlight) =>
      JSON.stringify(h)
    ),
    transcript_segments: transcriptSegments.map(
      (s: { start: number; end: number; value: string }) => JSON.stringify(s)
    ),
    metadata: {
      twelveLabsIndexId,
      twelveLabsAssetId,
      storageKey,
      mediaType,
      ...(thumbnailStorageKey && { thumbnailStorageKey }),
      ...(sourceUrl && { sourceUrl }),
    },
  };

  await vespaClient.feedMediaDocument(mediaDoc);

  await updateIndexedMediaIndexed(prisma, mediaId, { vespaId });

  await progress.complete(4);

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
  data: QueueMediaJobData
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
    findConnectorById(prisma, connectorId),
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
