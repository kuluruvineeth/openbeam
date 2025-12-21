import prisma, {
  createIndexedFile,
  createIndexedMedia,
  findIndexedFileByExternalId,
  findIndexedMediaByExternalId,
} from "@openplane/db";
import {
  addFileDownloadJob,
  addMediaDownloadJob,
  type FileDownloadMetadata,
  type MediaDownloadMetadata,
} from "@openplane/redis";
import {
  type ConnectorFileInfo,
  type ConnectorMediaInfo,
  type DownloadStrategy,
  isAudioFile,
  isVideoFile,
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

function buildFileDownloadMetadata(
  strategy: DownloadStrategy
): FileDownloadMetadata | null {
  if (strategy.type === "url") {
    return strategy.downloadUrl
      ? { connector: "slack", sourceUrl: strategy.downloadUrl }
      : null;
  }
  if (strategy.type === "gmail-attachment") {
    return {
      connector: "gmail",
      messageId: strategy.messageId,
      attachmentId: strategy.attachmentId,
    };
  }
  if (strategy.type === "google-drive") {
    return {
      connector: "google-drive",
      fileId: strategy.fileId,
      exportMimeType: strategy.exportMimeType,
    };
  }
  return null;
}

function buildMediaDownloadMetadata(
  strategy: DownloadStrategy
): MediaDownloadMetadata | null {
  if (strategy.type === "url") {
    return strategy.downloadUrl
      ? { connector: "slack", sourceUrl: strategy.downloadUrl }
      : null;
  }
  if (strategy.type === "gmail-attachment") {
    return {
      connector: "gmail",
      messageId: strategy.messageId,
      attachmentId: strategy.attachmentId,
    };
  }
  if (strategy.type === "google-drive") {
    return {
      connector: "google-drive",
      fileId: strategy.fileId,
      exportMimeType: strategy.exportMimeType,
    };
  }
  return null;
}

async function processSingleFile(
  file: ConnectorFileInfo,
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
  files: ConnectorFileInfo[],
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
  file: ConnectorFileInfo,
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
      const shouldRetry = existing.processingStatus === "FAILED";
      if (!shouldRetry) {
        logger.debug(
          { connectorId, fileId: file.id, status: existing.processingStatus },
          "File already indexed, skipping"
        );
        return false;
      }
      logger.info(
        { connectorId, fileId: file.id, errorCount: existing.errorCount },
        "Retrying previously failed file"
      );
    }
  }

  const downloadMetadata = buildFileDownloadMetadata(file.downloadStrategy);
  if (!downloadMetadata) {
    logger.warn(
      { connectorId, fileId: file.id, fileName: file.name },
      "File has no valid download strategy, skipping"
    );
    return false;
  }

  const storageKey = `pending/${connectorId}/files/${file.id}/${file.name}`;
  const vespaId = `file-${connectorId}-${file.id}`;

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
    sourceChannelId: file.sourceChannelId ?? null,
  });

  const legacySourceUrl =
    file.downloadStrategy.type === "url"
      ? file.downloadStrategy.downloadUrl
      : undefined;

  await addFileDownloadJob(
    {
      fileId: indexedFile.id,
      connectorId,
      externalId: file.id,
      sourceUrl: legacySourceUrl,
      downloadMetadata,
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
  file: ConnectorFileInfo | ConnectorMediaInfo,
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
      const shouldRetry = existing.processingStatus === "FAILED";
      if (!shouldRetry) {
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
      logger.info(
        {
          connectorId,
          mediaId: file.id,
          mediaType,
          errorCount: existing.errorCount,
        },
        "Retrying previously failed media"
      );
    }
  }

  const downloadMetadata = buildMediaDownloadMetadata(file.downloadStrategy);
  if (!downloadMetadata) {
    logger.warn(
      { connectorId, mediaId: file.id, mediaType, fileName: file.name },
      "Media has no valid download strategy, skipping"
    );
    return false;
  }

  const folder = mediaType === "audio" ? "audio" : "videos";
  const storageKey = `${folder}/${connectorId}/${file.id}/${file.name}`;
  const vespaId = `media_${connectorId}_${file.id}`;

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
    sourceChannelId: file.sourceChannelId ?? null,
    mediaType,
  });

  const legacySourceUrl =
    file.downloadStrategy.type === "url"
      ? file.downloadStrategy.downloadUrl
      : undefined;

  await addMediaDownloadJob(
    {
      mediaId: indexedMedia.id,
      connectorId,
      externalId: file.id,
      sourceUrl: legacySourceUrl,
      downloadMetadata,
      mimeType: file.mimeType,
      fileName: file.name,
      storageKey,
      mediaType,
      sourceChannelId: file.sourceChannelId ?? undefined,
      sourcePermalink: file.permalink,
      authorId: file.userId,
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
