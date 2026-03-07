import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createGmailClient, downloadAttachment } from "@openbeam/services";
import { ApplicationFailure } from "@temporalio/common";
import type { DownloadFileInput, DownloadFileOutput } from "../types";

export async function downloadGmailFile(
  input: DownloadFileInput,
  tempDir: string
): Promise<DownloadFileOutput> {
  const { connector, fileId, mimeType, metadata } = input;

  if (!connector.oauthProvider) {
    throw ApplicationFailure.nonRetryable(
      "Gmail connector missing OAuth credentials",
      "AuthorizationError"
    );
  }

  const messageId = metadata?.messageId;
  const attachmentId = metadata?.attachmentId ?? fileId;

  if (!messageId) {
    throw ApplicationFailure.nonRetryable(
      "Gmail download requires messageId in metadata",
      "InvalidInputError"
    );
  }

  const client = createGmailClient({
    connectorId: connector.id,
    accessToken: connector.oauthProvider.accessToken,
  });

  const buffer = await downloadAttachment(client, messageId, attachmentId);
  if (!buffer) {
    throw new Error(`Failed to download Gmail attachment: ${attachmentId}`);
  }

  const filename = metadata?.filename ?? `${attachmentId}`;
  const localPath = path.join(tempDir, connector.id, filename);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, buffer);

  return {
    localPath,
    size: buffer.length,
    contentType: mimeType ?? "application/octet-stream",
    originalFilename: metadata?.filename,
  };
}
