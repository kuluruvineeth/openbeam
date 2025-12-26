import type { GenericDocument } from "@openplane/vespa";
import type { LinearSyncBatch, LinearSyncCursor } from "../types";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: LinearSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): LinearSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
