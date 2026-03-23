import type {
  GuruSyncBatch,
  GuruSyncCursor,
} from "@openbeam/types/services/connectors/guru";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: GuruSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): GuruSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
