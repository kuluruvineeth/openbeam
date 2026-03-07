import type { GenericDocument } from "@openbeam/vespa";
import type { DeduplicateInput } from "./types";

export function createDeduplicateActivity() {
  return function deduplicateByChecksum(
    input: DeduplicateInput
  ): Promise<GenericDocument[]> {
    const seen = new Map<string, GenericDocument>();

    for (const doc of input.documents) {
      const hash = doc.checksum;
      if (!hash) {
        seen.set(doc.id, doc);
        continue;
      }

      const existing = seen.get(hash);
      if (!existing) {
        seen.set(hash, doc);
        continue;
      }

      const existingTime = existing.updated_at ?? existing.created_at ?? 0;
      const currentTime = doc.updated_at ?? doc.created_at ?? 0;
      if (currentTime > existingTime) {
        seen.set(hash, doc);
      }
    }

    return Promise.resolve(Array.from(seen.values()));
  };
}
