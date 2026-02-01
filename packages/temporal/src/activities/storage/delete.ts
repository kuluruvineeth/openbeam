import type { StorageObject, StorageProvider } from "@openplane/storage";
import type { DeleteByPrefixInput, DeleteFilesInput } from "./types";

export interface DeleteActivityDependencies {
  storage: StorageProvider;
}

export function createDeleteFilesActivity(deps: DeleteActivityDependencies) {
  const { storage } = deps;

  return async function deleteFiles(input: DeleteFilesInput): Promise<void> {
    if (input.keys.length === 0) {
      return;
    }

    await storage.deleteMany(input.keys);
  };
}

export function createDeleteByPrefixActivity(deps: DeleteActivityDependencies) {
  const { storage } = deps;

  return async function deleteByPrefix(
    input: DeleteByPrefixInput
  ): Promise<{ deleted: number }> {
    let deleted = 0;
    let cursor: string | undefined;

    do {
      const result = await storage.list(input.prefix, {
        limit: 1000,
        cursor,
      });

      if (result.objects.length > 0) {
        const keys = result.objects.map((obj: StorageObject) => obj.key);
        await storage.deleteMany(keys);
        deleted += keys.length;
      }

      cursor = result.nextCursor;
    } while (cursor);

    return { deleted };
  };
}
