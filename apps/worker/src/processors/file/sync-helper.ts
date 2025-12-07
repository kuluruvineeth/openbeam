import prisma from "@openplane/db";
import { addFileDownloadJob } from "@openplane/redis";
import type { SlackFileInfo } from "@openplane/services";
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
  };

  for (const file of files) {
    try {
      const processed = await processDiscoveredFile(file, {
        connectorId,
        skipExisting,
        priority,
      });

      if (processed) {
        result.queued += 1;
      } else {
        result.skipped += 1;
      }
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
    const existing = await prisma.indexedFile.findUnique({
      where: {
        connectorId_externalId: {
          connectorId,
          externalId: file.id,
        },
      },
    });

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

  const indexedFile = await prisma.indexedFile.create({
    data: {
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
    },
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

function getFileExtension(fileName: string): string | undefined {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1 || lastDot === fileName.length - 1) {
    return;
  }
  return fileName.slice(lastDot + 1).toLowerCase();
}
