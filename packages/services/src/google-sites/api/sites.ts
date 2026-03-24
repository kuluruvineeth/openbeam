import type { GoogleSitesClient } from "../client";

const SITE_MIME_TYPE = "application/vnd.google-apps.site";

const SITE_FIELDS =
  "id,name,mimeType,owners,createdTime,modifiedTime,webViewLink,description,driveId";

export type GoogleSiteFile = {
  id: string;
  name: string;
  mimeType: string;
  owners?: { displayName: string; emailAddress: string }[];
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  description?: string;
  driveId?: string;
};

type FileListResponse = {
  files: GoogleSiteFile[];
  nextPageToken?: string;
};

export async function* listAllSites(
  client: GoogleSitesClient,
  options?: { modifiedAfter?: string }
): AsyncGenerator<GoogleSiteFile[], void, undefined> {
  let pageToken: string | undefined;
  const parts = [`mimeType='${SITE_MIME_TYPE}'`, "trashed=false"];

  if (options?.modifiedAfter) {
    parts.push(`modifiedTime>'${options.modifiedAfter}'`);
  }

  const query = parts.join(" and ");

  do {
    const response = await client.get<FileListResponse>("/files", {
      q: query,
      fields: `nextPageToken,files(${SITE_FIELDS})`,
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
