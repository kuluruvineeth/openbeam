import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createGoogleDriveClient } from "@openplane/services";
import {
  GOOGLE_WORKSPACE_MIME_TYPES,
  isGoogleWorkspaceType,
} from "@openplane/types/services/connectors/google-drive";
import { ApplicationFailure } from "@temporalio/common";
import type { DownloadFileInput, DownloadFileOutput } from "../types";

const DEFAULT_EXPORT_FORMATS: Record<string, string> = {
  [GOOGLE_WORKSPACE_MIME_TYPES.DOCUMENT]: "text/plain",
  [GOOGLE_WORKSPACE_MIME_TYPES.SPREADSHEET]: "text/csv",
  [GOOGLE_WORKSPACE_MIME_TYPES.PRESENTATION]: "text/plain",
  [GOOGLE_WORKSPACE_MIME_TYPES.DRAWING]: "image/svg+xml",
  [GOOGLE_WORKSPACE_MIME_TYPES.FORM]: "text/plain",
};

export async function downloadGoogleDriveFile(
  input: DownloadFileInput,
  tempDir: string
): Promise<DownloadFileOutput> {
  const { connector, fileId, mimeType, metadata } = input;

  if (!connector.oauthProvider) {
    throw ApplicationFailure.nonRetryable(
      "Google Drive connector missing OAuth credentials",
      "AuthorizationError"
    );
  }

  const client = createGoogleDriveClient({
    connectorId: connector.id,
    accessToken: connector.oauthProvider.accessToken,
  });

  const filename = metadata?.filename ?? fileId;
  const localPath = path.join(tempDir, connector.id, filename);
  await fs.mkdir(path.dirname(localPath), { recursive: true });

  if (mimeType && isGoogleWorkspaceType(mimeType)) {
    const exportMimeType = DEFAULT_EXPORT_FORMATS[mimeType] ?? "text/plain";
    const textContent = await client.export(fileId, exportMimeType);

    const buffer = Buffer.from(textContent, "utf-8");
    await fs.writeFile(localPath, buffer);

    return {
      localPath,
      size: buffer.length,
      contentType: exportMimeType,
      originalFilename: metadata?.filename,
    };
  }

  const arrayBuffer = await client.download(fileId);
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(localPath, buffer);

  return {
    localPath,
    size: buffer.length,
    contentType: mimeType ?? "application/octet-stream",
    originalFilename: metadata?.filename,
  };
}
