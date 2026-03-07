import type { StorageProvider } from "@openbeam/storage";
import {
  createDeleteByPrefixActivity,
  createDeleteFilesActivity,
} from "./delete";
import {
  cleanupConnectorTempFiles,
  createCleanupTempFileActivity,
  createDownloadActivity,
} from "./download";
import { createExistsActivity, createListFilesActivity } from "./list";
import { createGetSignedUrlActivity } from "./signed-url";
import type { StorageActivities } from "./types";
import { createUploadActivity } from "./upload";

export interface StorageActivityDependencies {
  storage: StorageProvider;
  tempDir?: string;
}

export function createStorageActivities(
  deps: StorageActivityDependencies
): StorageActivities {
  return {
    downloadFile: createDownloadActivity(deps),
    uploadFile: createUploadActivity(deps),
    deleteFiles: createDeleteFilesActivity(deps),
    deleteByPrefix: createDeleteByPrefixActivity(deps),
    cleanupTempFile: createCleanupTempFileActivity(),
    getSignedUrl: createGetSignedUrlActivity(deps),
    listFiles: createListFilesActivity(deps),
    exists: createExistsActivity(deps),
  };
}

export { cleanupConnectorTempFiles };

export type {
  CleanupTempFileInput,
  DeleteByPrefixInput,
  DeleteFilesInput,
  DownloadFileInput,
  DownloadFileResult,
  ExistsInput,
  GetSignedUrlInput,
  ListFilesInput,
  ListFilesResult,
  StorageActivities,
  UploadFileInput,
  UploadFileResult,
} from "./types";
