import prisma, {
  createIndexedFile,
  createIndexedMedia,
  findIndexedFileByExternalId,
  findIndexedMediaByExternalId,
} from "@openplane/db";
import { addFileDownloadJob, addMediaDownloadJob } from "@openplane/redis";
import {
  isAudioFile,
  isVideoFile,
  type SlackFileInfo,
} from "@openplane/services";
import logger from "../../utils/logger";

export interface FileDiscoveryOptions {
  connectorId: string;
  skipExisting?: boolean;
  priority?: number;
}

export interface FileDiscoveryResult {
  queued: number;
  skipped: number;
  errors: number;
  mediaQueued: number;
}

type SingleFileResult = "queued" | "skipped" | "mediaQueued";

async function processSingleFile(
  file: SlackFileInfo,
  connectorId: string,
  skipExisting: boolean,
  priority: number
): Promise<SingleFileResult> {
  const extension = getFileExtension(file.name);
  const isVideo = isVideoFile(file.mimeType, extension);
  const isAudio = isAudioFile(file.mimeType, extension);

  if (isVideo || isAudio) {
    const mediaQueued = await processDiscoveredMedia(file, {
      connectorId,
      skipExisting,
      priority,
      mediaType: isAudio ? "audio" : "video",
    });
    return mediaQueued ? "mediaQueued" : "skipped";
  }

  const processed = await processDiscoveredFile(file, {
    connectorId,
    skipExisting,
    priority,
  });
  return processed ? "queued" : "skipped";
}

export async function processDiscoveredFiles(
  files: SlackFileInfo[],
  options: FileDiscoveryOptions
): Promise<FileDiscoveryResult> {
  const { connectorId, skipExisting = true, priority = 5 } = options;

  const result: FileDiscoveryResult = {
    queued: 0,
    skipped: 0,
    errors: 0,
    mediaQueued: 0,
  };

  for (const file of files) {
    try {
      const outcome = await processSingleFile(
        file,
        connectorId,
        skipExisting,
        priority
      );
      result[outcome] += 1;
    } catch (error) {
      logger.error(
        { error, connectorId, fileId: file.id, fileName: file.name },
        "Failed to process discovered file"
      );
      result.errors += 1;
    }
  }

  logger.info(
    { connectorId, ...result, totalFiles: files.length },
    "Processed discovered files from sync"
  );

  return result;
}

async function processDiscoveredFile(
  file: SlackFileInfo,
  options: FileDiscoveryOptions
): Promise<boolean> {
  const { connectorId, skipExisting = true, priority = 5 } = options;

  if (skipExisting) {
    const existing = await findIndexedFileByExternalId(
      prisma,
      connectorId,
      file.id
    );

    if (existing) {
      logger.debug(
        { connectorId, fileId: file.id, status: existing.processingStatus },
        "File already indexed, skipping"
      );
      return false;
    }
  }

  if (!file.downloadUrl) {
    logger.warn(
      { connectorId, fileId: file.id, fileName: file.name },
      "File has no download URL, skipping"
    );
    return false;
  }

  const storageKey = `pending/${connectorId}/files/${file.id}/${file.name}`;
  const vespaId = `file-${connectorId}-${file.id}`;

  const sourceChannelId = file.channels?.[0] ?? null;

  const indexedFile = await createIndexedFile(prisma, {
    connectorId,
    externalId: file.id,
    vespaId,
    fileName: file.name,
    mimeType: file.mimeType,
    fileSize: file.size ?? 0,
    fileExtension: getFileExtension(file.name),
    storageKey,
    processingStatus: "PENDING",
    sourceChannelId,
  });

  await addFileDownloadJob(
    {
      fileId: indexedFile.id,
      connectorId,
      externalId: file.id,
      sourceUrl: file.downloadUrl,
      mimeType: file.mimeType,
      fileName: file.name,
    },
    priority
  );

  logger.debug(
    { connectorId, fileId: file.id, indexedFileId: indexedFile.id },
    "Queued file for processing from sync"
  );

  return true;
}

interface MediaDiscoveryOptions extends FileDiscoveryOptions {
  mediaType: "video" | "audio";
}

async function processDiscoveredMedia(
  file: SlackFileInfo,
  options: MediaDiscoveryOptions
): Promise<boolean> {
  const { connectorId, skipExisting = true, priority, mediaType } = options;
  const jobPriority = priority ?? 5;

  if (skipExisting) {
    const existing = await findIndexedMediaByExternalId(
      prisma,
      connectorId,
      file.id
    );

    if (existing) {
      logger.debug(
        {
          connectorId,
          mediaId: file.id,
          mediaType,
          status: existing.processingStatus,
        },
        "Media already indexed, skipping"
      );
      return false;
    }
  }

  if (!file.downloadUrl) {
    logger.warn(
      { connectorId, mediaId: file.id, mediaType, fileName: file.name },
      "Media has no download URL, skipping"
    );
    return false;
  }

  const folder = mediaType === "audio" ? "audio" : "videos";
  const storageKey = `${folder}/${connectorId}/${file.id}/${file.name}`;
  const vespaId = `media_${connectorId}_${file.id}`;
  const sourceChannelId = file.channels?.[0] ?? null;

  const indexedMedia = await createIndexedMedia(prisma, {
    connectorId,
    externalId: file.id,
    vespaId,
    fileName: file.name,
    mimeType: file.mimeType,
    fileSize: file.size ?? 0,
    fileExtension: getFileExtension(file.name),
    storageKey,
    processingStatus: "PENDING",
    sourceChannelId,
    mediaType,
  });

  await addMediaDownloadJob(
    {
      mediaId: indexedMedia.id,
      connectorId,
      externalId: file.id,
      sourceUrl: file.downloadUrl,
      mimeType: file.mimeType,
      fileName: file.name,
      storageKey,
      mediaType,
      sourceChannelId: sourceChannelId ?? undefined,
      slackPermalink: file.permalink,
    },
    jobPriority
  );

  logger.debug(
    {
      connectorId,
      mediaId: file.id,
      mediaType,
      indexedMediaId: indexedMedia.id,
    },
    "Queued media for processing from sync"
  );

  return true;
}

function getFileExtension(fileName: string): string | undefined {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1 || lastDot === fileName.length - 1) {
    return;
  }
  return fileName.slice(lastDot + 1).toLowerCase();
}
