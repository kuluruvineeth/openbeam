import type { GoogleDriveTransformContext } from "@openbeam/types/services/connectors/google-drive";
import type { GenericDocument } from "@openbeam/vespa";
import { fetchFiles } from "../api/files";
import type { GoogleDriveClient } from "../client";
import { transformFile } from "../transformers/file";
import { extractFileContent } from "../utils/content-extractor";
import { isTextExtractable } from "../utils/mime-types";

export interface FederatedSearchOptions {
  query: string;
  maxResults?: number;
  mimeTypes?: string[];
  excludeMimeTypes?: string[];
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  owner?: string;
  includeSharedDrives?: boolean;
  includeTrashed?: boolean;
  starred?: boolean;
  extractContent?: boolean;
}

export interface FederatedSearchResult {
  documents: GenericDocument[];
  stats: {
    totalResults: number;
    queryTimeMs: number;
  };
}

export async function federatedSearch(
  client: GoogleDriveClient,
  context: GoogleDriveTransformContext,
  options: FederatedSearchOptions
): Promise<FederatedSearchResult> {
  const startTime = Date.now();
  const {
    query,
    maxResults = 50,
    mimeTypes,
    excludeMimeTypes,
    modifiedAfter,
    modifiedBefore,
    owner,
    includeSharedDrives = true,
    includeTrashed = false,
    starred,
    extractContent = false,
  } = options;

  const driveQuery = buildDriveQuery({
    query,
    mimeTypes,
    excludeMimeTypes,
    modifiedAfter,
    modifiedBefore,
    owner,
    trashed: includeTrashed,
    starred,
  });

  const corpora = includeSharedDrives ? "allDrives" : "user";

  const documents: GenericDocument[] = [];

  for await (const file of fetchFiles(client, {
    query: driveQuery,
    corpora,
    pageSize: Math.min(maxResults, 100),
  })) {
    let content: string | undefined;

    if (extractContent && isTextExtractable(file.mimeType)) {
      const extracted = await extractFileContent(client, file);
      content = extracted.text;
    }

    const document = await transformFile(file, context, { content });
    documents.push(document);

    if (documents.length >= maxResults) {
      break;
    }
  }

  return {
    documents,
    stats: {
      totalResults: documents.length,
      queryTimeMs: Date.now() - startTime,
    },
  };
}

interface QueryParts {
  query: string;
  mimeTypes?: string[];
  excludeMimeTypes?: string[];
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  owner?: string;
  trashed?: boolean;
  starred?: boolean;
}

function buildDriveQuery(parts: QueryParts): string {
  const queryParts: string[] = [];

  if (parts.query) {
    queryParts.push(`fullText contains '${escapeQueryString(parts.query)}'`);
  }

  if (parts.mimeTypes?.length) {
    const mimeTypeQueries = parts.mimeTypes.map((m) => `mimeType = '${m}'`);
    queryParts.push(`(${mimeTypeQueries.join(" or ")})`);
  }

  if (parts.excludeMimeTypes?.length) {
    for (const m of parts.excludeMimeTypes) {
      queryParts.push(`mimeType != '${m}'`);
    }
  }

  if (parts.modifiedAfter) {
    queryParts.push(`modifiedTime > '${parts.modifiedAfter.toISOString()}'`);
  }

  if (parts.modifiedBefore) {
    queryParts.push(`modifiedTime < '${parts.modifiedBefore.toISOString()}'`);
  }

  if (parts.owner) {
    queryParts.push(`'${parts.owner}' in owners`);
  }

  if (parts.trashed !== undefined) {
    queryParts.push(`trashed = ${parts.trashed}`);
  }

  if (parts.starred !== undefined) {
    queryParts.push(`starred = ${parts.starred}`);
  }

  return queryParts.join(" and ");
}

function escapeQueryString(query: string): string {
  return query.replace(/'/g, "\\'");
}

export async function searchByName(
  client: GoogleDriveClient,
  context: GoogleDriveTransformContext,
  name: string,
  options: Omit<FederatedSearchOptions, "query"> = {}
): Promise<FederatedSearchResult> {
  return await federatedSearch(client, context, {
    ...options,
    query: name,
  });
}

export async function searchDocuments(
  client: GoogleDriveClient,
  context: GoogleDriveTransformContext,
  options: Omit<FederatedSearchOptions, "mimeTypes">
): Promise<FederatedSearchResult> {
  return await federatedSearch(client, context, {
    ...options,
    mimeTypes: [
      "application/vnd.google-apps.document",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ],
  });
}

export async function searchSpreadsheets(
  client: GoogleDriveClient,
  context: GoogleDriveTransformContext,
  options: Omit<FederatedSearchOptions, "mimeTypes">
): Promise<FederatedSearchResult> {
  return await federatedSearch(client, context, {
    ...options,
    mimeTypes: [
      "application/vnd.google-apps.spreadsheet",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ],
  });
}

export async function searchPresentations(
  client: GoogleDriveClient,
  context: GoogleDriveTransformContext,
  options: Omit<FederatedSearchOptions, "mimeTypes">
): Promise<FederatedSearchResult> {
  return await federatedSearch(client, context, {
    ...options,
    mimeTypes: [
      "application/vnd.google-apps.presentation",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-powerpoint",
    ],
  });
}

export async function searchPdfs(
  client: GoogleDriveClient,
  context: GoogleDriveTransformContext,
  options: Omit<FederatedSearchOptions, "mimeTypes">
): Promise<FederatedSearchResult> {
  return await federatedSearch(client, context, {
    ...options,
    mimeTypes: ["application/pdf"],
  });
}

export async function searchImages(
  client: GoogleDriveClient,
  context: GoogleDriveTransformContext,
  options: Omit<FederatedSearchOptions, "mimeTypes">
): Promise<FederatedSearchResult> {
  return await federatedSearch(client, context, {
    ...options,
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ],
  });
}

export async function searchVideos(
  client: GoogleDriveClient,
  context: GoogleDriveTransformContext,
  options: Omit<FederatedSearchOptions, "mimeTypes">
): Promise<FederatedSearchResult> {
  return await federatedSearch(client, context, {
    ...options,
    mimeTypes: [
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
      "video/webm",
    ],
  });
}

export function translateSearchQuery(userQuery: string): string {
  let driveQuery = userQuery;

  driveQuery = driveQuery.replace(/\bowner:([^\s]+)/g, "'$1' in owners");
  driveQuery = driveQuery.replace(
    /\btype:doc\b/gi,
    "mimeType contains 'document'"
  );
  driveQuery = driveQuery.replace(
    /\btype:sheet\b/gi,
    "mimeType contains 'spreadsheet'"
  );
  driveQuery = driveQuery.replace(
    /\btype:slide\b/gi,
    "mimeType contains 'presentation'"
  );
  driveQuery = driveQuery.replace(
    /\btype:pdf\b/gi,
    "mimeType = 'application/pdf'"
  );
  driveQuery = driveQuery.replace(
    /\btype:image\b/gi,
    "mimeType contains 'image'"
  );
  driveQuery = driveQuery.replace(
    /\btype:video\b/gi,
    "mimeType contains 'video'"
  );
  driveQuery = driveQuery.replace(
    /\btype:folder\b/gi,
    "mimeType = 'application/vnd.google-apps.folder'"
  );

  driveQuery = driveQuery.replace(/\bstarred\b/gi, "starred = true");
  driveQuery = driveQuery.replace(/\btrashed\b/gi, "trashed = true");

  return driveQuery;
}
