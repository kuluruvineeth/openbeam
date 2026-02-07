import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ApplicationFailure } from "@temporalio/common";
import type { DownloadFileInput, DownloadFileOutput } from "../types";

export async function downloadGenericFile(
  input: DownloadFileInput,
  tempDir: string
): Promise<DownloadFileOutput> {
  const { connector, fileId, mimeType, metadata } = input;

  const downloadUrl = metadata?.downloadUrl;
  if (!downloadUrl) {
    throw ApplicationFailure.nonRetryable(
      "Generic download requires downloadUrl in metadata",
      "InvalidInputError"
    );
  }

  const headers: Record<string, string> = {};

  if (connector.oauthProvider?.accessToken) {
    headers.Authorization = `Bearer ${connector.oauthProvider.accessToken}`;
  }

  const response = await fetch(downloadUrl, {
    headers,
    signal: AbortSignal.timeout(300_000),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to download file: ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const filename = metadata?.filename ?? fileId;
  const localPath = path.join(tempDir, connector.id, filename);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, buffer);

  const contentType =
    response.headers.get("content-type") ??
    mimeType ??
    "application/octet-stream";

  return {
    localPath,
    size: buffer.length,
    contentType,
    originalFilename: metadata?.filename,
  };
}
