import { logger } from "../../lib/logger";
import type { GoogleSitesClient } from "../client";

const PAGE_FIELDS =
  "id,name,mimeType,owners,createdTime,modifiedTime,webViewLink,parents";

export type GoogleSitePage = {
  id: string;
  name: string;
  mimeType: string;
  owners?: { displayName: string; emailAddress: string }[];
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  parents?: string[];
  htmlContent?: string;
};

type FileListResponse = {
  files: GoogleSitePage[];
  nextPageToken?: string;
};

export async function* listPagesForSite(
  client: GoogleSitesClient,
  siteId: string,
  options?: { modifiedAfter?: string }
): AsyncGenerator<GoogleSitePage[], void, undefined> {
  let pageToken: string | undefined;
  const parts = [`'${siteId}' in parents`, "trashed=false"];

  if (options?.modifiedAfter) {
    parts.push(`modifiedTime>'${options.modifiedAfter}'`);
  }

  const query = parts.join(" and ");

  do {
    const response = await client.get<FileListResponse>("/files", {
      q: query,
      fields: `nextPageToken,files(${PAGE_FIELDS})`,
      pageSize: 100,
      pageToken,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    const files = response.files ?? [];
    if (files.length > 0) {
      yield files;
    }
    pageToken = response.nextPageToken;
  } while (pageToken);
}

export async function exportPageContent(
  client: GoogleSitesClient,
  pageId: string
): Promise<string> {
  try {
    return await client.export(pageId, "text/html");
  } catch (error) {
    logger.debug(
      { error, pageId },
      "Failed to export Google Sites page content"
    );
    return "";
  }
}
