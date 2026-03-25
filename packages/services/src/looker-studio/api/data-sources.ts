import type { LookerStudioClient } from "../client";

const DATA_SOURCE_MIME_TYPE =
  "application/vnd.google-apps.data-studio-data-source";

const DATA_SOURCE_FIELDS =
  "id,name,mimeType,owners,createdTime,modifiedTime,webViewLink,description";

export type LookerStudioDataSource = {
  id: string;
  name: string;
  mimeType: string;
  owners?: { displayName: string; emailAddress: string }[];
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  description?: string;
};

type FileListResponse = {
  files: LookerStudioDataSource[];
  nextPageToken?: string;
};

export async function* listAllDataSources(
  client: LookerStudioClient,
  options?: { modifiedAfter?: string }
): AsyncGenerator<LookerStudioDataSource[], void, undefined> {
  let pageToken: string | undefined;
  const parts = [`mimeType='${DATA_SOURCE_MIME_TYPE}'`, "trashed=false"];

  if (options?.modifiedAfter) {
    parts.push(`modifiedTime>'${options.modifiedAfter}'`);
  }

  const query = parts.join(" and ");

  do {
    const response = await client.get<FileListResponse>("/files", {
      q: query,
      fields: `nextPageToken,files(${DATA_SOURCE_FIELDS})`,
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
