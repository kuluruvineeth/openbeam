import * as fs from "node:fs/promises";
import type { StorageProvider } from "@openbeam/storage";
import type { UploadFileInput, UploadFileResult } from "./types";

export interface UploadActivityDependencies {
  storage: StorageProvider;
}

export function createUploadActivity(deps: UploadActivityDependencies) {
  const { storage } = deps;

  return async function uploadFile(
    input: UploadFileInput
  ): Promise<UploadFileResult> {
    const fileData = await fs.readFile(input.localPath);

    const url = await storage.upload(input.key, fileData, {
      contentType: input.contentType,
      metadata: input.metadata,
    });

    return {
      url,
      key: input.key,
    };
  };
}
