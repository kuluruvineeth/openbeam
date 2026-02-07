import * as os from "node:os";
import type { DownloadFileInput, DownloadFileOutput } from "../types";
import { downloadGenericFile } from "./generic";
import { downloadGmailFile } from "./gmail";
import { downloadGoogleDriveFile } from "./google-drive";
import { downloadSlackFile } from "./slack";

export interface DownloadActivityDependencies {
  tempDir?: string;
}

type DownloadHandler = (
  input: DownloadFileInput,
  tempDir: string
) => Promise<DownloadFileOutput>;

const DOWNLOAD_STRATEGIES: Record<string, DownloadHandler> = {
  gmail: downloadGmailFile,
  google_drive: downloadGoogleDriveFile,
  slack: downloadSlackFile,
};

export function createConnectorDownloadActivity(
  deps: DownloadActivityDependencies
) {
  const { tempDir = os.tmpdir() } = deps;

  // biome-ignore lint/suspicious/useAwait: returns promise from handler, caller awaits
  return async function downloadConnectorFile(
    input: DownloadFileInput
  ): Promise<DownloadFileOutput> {
    const strategy = DOWNLOAD_STRATEGIES[input.connector.type];
    const handler = strategy ?? downloadGenericFile;

    return handler(input, tempDir);
  };
}

export { downloadGenericFile } from "./generic";
export { downloadGmailFile } from "./gmail";
export { downloadGoogleDriveFile } from "./google-drive";
export { downloadSlackFile } from "./slack";
