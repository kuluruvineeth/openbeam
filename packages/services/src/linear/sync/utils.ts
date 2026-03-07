import type {
  LinearSyncBatch,
  LinearSyncCursor,
} from "@openbeam/types/services/connectors/linear";
import type { GenericDocument } from "@openbeam/vespa";

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
