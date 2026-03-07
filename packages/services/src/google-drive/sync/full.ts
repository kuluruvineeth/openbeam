import {
  type DriveFile,
  type DriveMediaInfo,
  GOOGLE_WORKSPACE_MIME_TYPES,
  type GoogleDriveSyncBatch,
  type GoogleDriveSyncCursor,
  type GoogleDriveTransformContext,
  isUnexportableGoogleType,
} from "@openbeam/types/services/connectors/google-drive";
import type { GenericDocument } from "@openbeam/vespa";
import type { ConnectorFileInfo } from "../../files/types";
import { logger } from "../../lib/logger";
import { getStartPageToken } from "../api/changes";
import { getDefaultExportMimeType } from "../api/export";
import { fetchFiles } from "../api/files";
import type { GoogleDriveClient } from "../client";
import { transformFile } from "../transformers/file";
import { extractFileContent, getDriveId } from "../utils/content-extractor";
import { isMediaType, isTextExtractable } from "../utils/mime-types";

export interface FullSyncOptions {
  cursor?: GoogleDriveSyncCursor;
  batchSize?: number;
  includeSharedDrives?: boolean;
  includeTrashed?: boolean;
  mimeTypeFilter?: string[];
  lookbackDays?: number;
  indexMedia?: boolean;
  extractContent?: boolean;
  onMediaDiscovered?: (media: DriveMediaInfo[]) => Promise<void>;
  onFilesDiscovered?: (files: ConnectorFileInfo[]) => Promise<void>;
}

export async function* fullSync(
  client: GoogleDriveClient,
  context: GoogleDriveTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<GoogleDriveSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = 100,
    includeSharedDrives = true,
    includeTrashed = false,
    mimeTypeFilter,
    lookbackDays,
    indexMedia = true,
    extractContent = true,
    onMediaDiscovered,
    onFilesDiscovered,
  } = options;

  const startPageToken = await getStartPageToken(client);

  const query = buildFullSyncQuery({
    includeTrashed,
    mimeTypeFilter,
    lookbackDays,
  });

  logger.info(
    { query, includeSharedDrives, includeTrashed, lookbackDays },
    "Google Drive full sync started"
  );

  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  const cursor: GoogleDriveSyncCursor = {
    lastFullSync: Date.now(),
    startPageToken,
  };

  const corpora = includeSharedDrives ? "allDrives" : "user";

  for await (const file of fetchFiles(client, { query, corpora })) {
    if (shouldSkipFile(file)) {
      skipped += 1;
      continue;
    }

    try {
      let content: string | undefined;

      if (extractContent && isTextExtractable(file.mimeType)) {
        const extracted = await extractFileContent(client, file);
        content = extracted.text;
      }

      const document = await transformFile(file, context, { content });
      documents.push(document);

      if (indexMedia && isMediaType(file.mimeType) && onMediaDiscovered) {
        const mediaInfo = extractMediaInfo(file);
        if (mediaInfo) {
          await onMediaDiscovered([mediaInfo]);
        }
      }

      if (onFilesDiscovered) {
        const fileInfo = buildConnectorFileInfo(file);
        await onFilesDiscovered([fileInfo]);
      }

      processed += 1;

      if (documents.length >= batchSize) {
        yield {
          items: documents,
          cursor: { ...cursor },
          hasMore: true,
          stats: { processed, skipped, errors },
        };

        documents = [];
      }
    } catch (error) {
      logger.error(
        { error, fileId: file.id, fileName: file.name },
        "Error processing Google Drive file"
      );
      errors += 1;
    }
  }

  logger.info(
    { processed, skipped, errors, documentsCount: documents.length },
    "Google Drive full sync iteration complete"
  );

  if (documents.length > 0) {
    yield {
      items: documents,
      cursor: { ...cursor },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  }
}

function buildFullSyncQuery(options: {
  includeTrashed?: boolean;
  mimeTypeFilter?: string[];
  lookbackDays?: number;
}): string {
  const parts: string[] = [];

  if (!options.includeTrashed) {
    parts.push("trashed = false");
  }

  parts.push(`mimeType != '${GOOGLE_WORKSPACE_MIME_TYPES.FOLDER}'`);

  if (options.mimeTypeFilter?.length) {
    const mimeTypeQueries = options.mimeTypeFilter.map(
      (m) => `mimeType = '${m}'`
    );
    parts.push(`(${mimeTypeQueries.join(" or ")})`);
  }

  if (options.lookbackDays && options.lookbackDays > 0) {
    const date = new Date();
    date.setDate(date.getDate() - options.lookbackDays);
    parts.push(`modifiedTime > '${date.toISOString()}'`);
  }

  return parts.join(" and ");
}

function shouldSkipFile(file: DriveFile): boolean {
  if (file.trashed) {
    return true;
  }

  if (isUnexportableGoogleType(file.mimeType)) {
    return true;
  }

  return false;
}

function extractMediaInfo(file: DriveFile): DriveMediaInfo | null {
  const mimeType = file.mimeType;

  let mediaType: "video" | "audio" | "image";
  if (mimeType.startsWith("video/")) {
    mediaType = "video";
  } else if (mimeType.startsWith("audio/")) {
    mediaType = "audio";
  } else if (mimeType.startsWith("image/")) {
    mediaType = "image";
  } else {
    return null;
  }

  return {
    fileId: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size ? Number.parseInt(file.size, 10) : 0,
    mediaType,
    webViewLink: file.webViewLink,
    thumbnailLink: file.thumbnailLink,
  };
}

const EXPORT_MIME_EXTENSIONS: Record<string, string> = {
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/pdf": ".pdf",
  "image/svg+xml": ".svg",
};

function addExtensionForExport(name: string, exportMimeType: string): string {
  const ext = EXPORT_MIME_EXTENSIONS[exportMimeType];
  if (!ext) {
    return name;
  }
  if (name.endsWith(ext)) {
    return name;
  }
  return `${name}${ext}`;
}

function buildConnectorFileInfo(file: DriveFile): ConnectorFileInfo {
  const exportMimeType = getDefaultExportMimeType(file.mimeType);

  const effectiveName = exportMimeType
    ? addExtensionForExport(file.name, exportMimeType)
    : file.name;

  const sourceChannelId = getDriveId(file) ?? "my-drive";

  return {
    id: file.id,
    name: effectiveName,
    mimeType: file.mimeType,
    size: file.size ? Number.parseInt(file.size, 10) : undefined,
    downloadStrategy: {
      type: "google-drive",
      fileId: file.id,
      exportMimeType: exportMimeType ?? undefined,
    },
    permalink: file.webViewLink,
    createdAt: file.createdTime
      ? new Date(file.createdTime).getTime()
      : undefined,
    sourceChannelId,
  };
}
