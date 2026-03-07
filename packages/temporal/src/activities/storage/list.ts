import type { StorageObject, StorageProvider } from "@openbeam/storage";
import type { ExistsInput, ListFilesInput, ListFilesResult } from "./types";

export interface ListActivityDependencies {
  storage: StorageProvider;
}

export function createListFilesActivity(deps: ListActivityDependencies) {
  const { storage } = deps;

  return async function listFiles(
    input: ListFilesInput
  ): Promise<ListFilesResult> {
    const result = await storage.list(input.prefix, {
      limit: input.limit ?? 1000,
      cursor: input.cursor,
    });

    return {
      objects: result.objects.map((obj: StorageObject) => ({
        key: obj.key,
        lastModified: obj.lastModified,
        size: obj.size,
        eTag: obj.eTag,
      })),
      nextCursor: result.nextCursor,
    };
  };
}

export function createExistsActivity(deps: ListActivityDependencies) {
  const { storage } = deps;

  return function exists(input: ExistsInput): Promise<boolean> {
    return storage.exists(input.key);
  };
}
