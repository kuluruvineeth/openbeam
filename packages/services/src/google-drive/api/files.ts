import {
  type DriveFile,
  type DriveFileListResponse,
  DriveFileListResponseSchema,
  DriveFileSchema,
} from "@openbeam/types/services/connectors/google-drive";
import { logger } from "../../lib/logger";
import type { GoogleDriveClient } from "../client";

const DEFAULT_FILE_FIELDS = [
  "id",
  "name",
  "mimeType",
  "parents",
  "createdTime",
  "modifiedTime",
  "size",
  "webViewLink",
  "webContentLink",
  "iconLink",
  "thumbnailLink",
  "owners",
  "lastModifyingUser",
  "shared",
  "trashed",
  "starred",
  "description",
  "permissions(id,type,role,emailAddress,displayName)",
  "capabilities",
  "driveId",
  "fileExtension",
  "md5Checksum",
  "contentHints",
  "imageMediaMetadata",
  "videoMediaMetadata",
  "shortcutDetails",
].join(",");

const DEFAULT_LIST_FIELDS = `nextPageToken,incompleteSearch,files(${DEFAULT_FILE_FIELDS})`;

export interface FetchFilesOptions {
  query?: string;
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
  spaces?: "drive" | "appDataFolder";
  corpora?: "user" | "drive" | "domain" | "allDrives";
  driveId?: string;
  includeItemsFromAllDrives?: boolean;
  supportsAllDrives?: boolean;
  fields?: string;
}

export interface FetchFileOptions {
  fields?: string;
  supportsAllDrives?: boolean;
}

export async function* fetchFiles(
  client: GoogleDriveClient,
  options: FetchFilesOptions = {}
): AsyncGenerator<DriveFile, void, undefined> {
  const {
    query,
    pageSize = 100,
    orderBy = "modifiedTime desc",
    spaces = "drive",
    corpora = "user",
    driveId,
    includeItemsFromAllDrives = true,
    supportsAllDrives = true,
    fields = DEFAULT_LIST_FIELDS,
  } = options;

  let pageToken = options.pageToken;

  do {
    const params: Record<string, string | number | boolean | undefined> = {
      pageSize,
      orderBy,
      spaces,
      corpora,
      includeItemsFromAllDrives,
      supportsAllDrives,
      fields,
      pageToken,
    };

    if (query) {
      params.q = query;
    }
    if (driveId) {
      params.driveId = driveId;
      params.corpora = "drive";
    }

    const response = await client.get<DriveFileListResponse>("/files", params);
    const parsed = DriveFileListResponseSchema.safeParse(response);
    if (!parsed.success) {
      logger.error(
        { error: parsed.error.format(), query },
        "Failed to parse Google Drive file list response"
      );
      continue;
    }

    const files = parsed.data.files ?? [];
    logger.info(
      { fileCount: files.length, hasNextPage: !!parsed.data.nextPageToken },
      "Fetched Google Drive files page"
    );

    for (const file of files) {
      yield file;
    }

    pageToken = parsed.data.nextPageToken;
  } while (pageToken);
}

export async function getFile(
  client: GoogleDriveClient,
  fileId: string,
  options: FetchFileOptions = {}
): Promise<DriveFile | null> {
  const { fields = DEFAULT_FILE_FIELDS, supportsAllDrives = true } = options;

  const response = await client.get<DriveFile>(`/files/${fileId}`, {
    fields,
    supportsAllDrives,
  });

  const parsed = DriveFileSchema.safeParse(response);
  return parsed.success ? parsed.data : null;
}

export async function batchGetFiles(
  client: GoogleDriveClient,
  fileIds: string[],
  options: FetchFileOptions = {}
): Promise<DriveFile[]> {
  const { fields = DEFAULT_FILE_FIELDS, supportsAllDrives = true } = options;

  if (fileIds.length === 0) {
    return [];
  }

  const batchSize = 100;
  const results: DriveFile[] = [];

  for (let i = 0; i < fileIds.length; i += batchSize) {
    const batch = fileIds.slice(i, i + batchSize);
    const paths = batch.map(
      (id) =>
        `/files/${id}?fields=${encodeURIComponent(fields)}&supportsAllDrives=${supportsAllDrives}`
    );

    const responses = await client.batchGet<DriveFile>(paths);

    for (const response of responses) {
      if (!response || (response as { error?: unknown }).error) {
        continue;
      }
      const parsed = DriveFileSchema.safeParse(response);
      if (parsed.success) {
        results.push(parsed.data);
      }
    }
  }

  return results;
}

export async function* fetchFilesWithMetadata(
  client: GoogleDriveClient,
  options: FetchFilesOptions = {}
): AsyncGenerator<DriveFile, void, undefined> {
  const fileIds: string[] = [];
  const batchSize = 100;

  for await (const file of fetchFiles(client, options)) {
    fileIds.push(file.id);

    if (fileIds.length >= batchSize) {
      const files = await batchGetFiles(client, fileIds, {
        fields: options.fields,
      });
      for (const f of files) {
        yield f;
      }
      fileIds.length = 0;
    }
  }

  if (fileIds.length > 0) {
    const files = await batchGetFiles(client, fileIds, {
      fields: options.fields,
    });
    for (const f of files) {
      yield f;
    }
  }
}

export function buildFileQuery(options: {
  mimeTypes?: string[];
  notMimeTypes?: string[];
  parentId?: string;
  trashed?: boolean;
  starred?: boolean;
  ownedByMe?: boolean;
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  nameContains?: string;
  fullTextContains?: string;
}): string {
  const parts: string[] = [];

  if (options.mimeTypes?.length) {
    const mimeTypeQueries = options.mimeTypes.map((m) => `mimeType = '${m}'`);
    parts.push(`(${mimeTypeQueries.join(" or ")})`);
  }

  if (options.notMimeTypes?.length) {
    for (const m of options.notMimeTypes) {
      parts.push(`mimeType != '${m}'`);
    }
  }

  if (options.parentId) {
    parts.push(`'${options.parentId}' in parents`);
  }

  if (options.trashed !== undefined) {
    parts.push(`trashed = ${options.trashed}`);
  }

  if (options.starred !== undefined) {
    parts.push(`starred = ${options.starred}`);
  }

  if (options.ownedByMe !== undefined) {
    parts.push(`'me' in owners`);
  }

  if (options.modifiedAfter) {
    parts.push(`modifiedTime > '${options.modifiedAfter.toISOString()}'`);
  }

  if (options.modifiedBefore) {
    parts.push(`modifiedTime < '${options.modifiedBefore.toISOString()}'`);
  }

  if (options.nameContains) {
    parts.push(`name contains '${options.nameContains}'`);
  }

  if (options.fullTextContains) {
    parts.push(`fullText contains '${options.fullTextContains}'`);
  }

  return parts.join(" and ");
}

export async function searchFiles(
  client: GoogleDriveClient,
  query: string,
  options: Omit<FetchFilesOptions, "query"> = {}
): Promise<DriveFile[]> {
  const files: DriveFile[] = [];

  for await (const file of fetchFiles(client, { ...options, query })) {
    files.push(file);
  }

  return files;
}

export async function listFolderContents(
  client: GoogleDriveClient,
  folderId: string,
  options: Omit<FetchFilesOptions, "query"> = {}
): Promise<DriveFile[]> {
  const query = `'${folderId}' in parents and trashed = false`;
  return await searchFiles(client, query, options);
}

export async function getRootFolder(
  client: GoogleDriveClient
): Promise<DriveFile | null> {
  return await getFile(client, "root");
}
