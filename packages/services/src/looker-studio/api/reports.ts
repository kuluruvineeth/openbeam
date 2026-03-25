import type { LookerStudioClient } from "../client";

const REPORT_MIME_TYPE = "application/vnd.google-apps.data-studio-report";

const REPORT_FIELDS =
  "id,name,mimeType,owners,createdTime,modifiedTime,webViewLink,description,starred";

export type LookerStudioReport = {
  id: string;
  name: string;
  mimeType: string;
  owners?: { displayName: string; emailAddress: string }[];
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  description?: string;
  starred?: boolean;
};

type FileListResponse = {
  files: LookerStudioReport[];
  nextPageToken?: string;
};

export async function* listAllReports(
  client: LookerStudioClient,
  options?: { modifiedAfter?: string }
): AsyncGenerator<LookerStudioReport[], void, undefined> {
  let pageToken: string | undefined;
  const parts = [`mimeType='${REPORT_MIME_TYPE}'`, "trashed=false"];

  if (options?.modifiedAfter) {
    parts.push(`modifiedTime>'${options.modifiedAfter}'`);
  }

  const query = parts.join(" and ");

  do {
    const response = await client.get<FileListResponse>("/files", {
      q: query,
      fields: `nextPageToken,files(${REPORT_FIELDS})`,
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
