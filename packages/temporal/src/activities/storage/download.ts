import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { StorageProvider } from "@openplane/storage";
import type {
  CleanupTempFileInput,
  DownloadFileInput,
  DownloadFileResult,
} from "./types";

export interface DownloadActivityDependencies {
  storage: StorageProvider;
  tempDir?: string;
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function downloadFromUrl(
  url: string,
  destination: string
): Promise<{ size: number; contentType?: string }> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(300_000),
  });

  if (!response.ok) {
    throw new Error(
      `Download failed: ${response.status} ${response.statusText}`
    );
  }

  const contentType = response.headers.get("content-type") ?? undefined;
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await fs.writeFile(destination, buffer);

  return {
    size: buffer.length,
    contentType,
  };
}

export function createDownloadActivity(deps: DownloadActivityDependencies) {
  const { tempDir = os.tmpdir() } = deps;

  return async function downloadFile(
    input: DownloadFileInput
  ): Promise<DownloadFileResult> {
    const fileDir = path.join(tempDir, "openplane", input.connectorId);
    await ensureDir(fileDir);

    const ext = path.extname(new URL(input.url).pathname) || "";
    const localPath = path.join(fileDir, `${input.externalId}${ext}`);

    const { size, contentType } = await downloadFromUrl(input.url, localPath);

    return {
      localPath,
      size,
      contentType,
    };
  };
}

export function createCleanupTempFileActivity() {
  return async function cleanupTempFile(
    input: CleanupTempFileInput
  ): Promise<void> {
    try {
      await fs.unlink(input.path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  };
}

export async function cleanupConnectorTempFiles(
  connectorId: string,
  tempDir = os.tmpdir()
): Promise<void> {
  const connectorTempDir = path.join(tempDir, "openplane", connectorId);

  try {
    await fs.rm(connectorTempDir, { recursive: true, force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
