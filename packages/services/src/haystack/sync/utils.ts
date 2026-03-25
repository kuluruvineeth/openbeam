import type {
  HaystackSyncBatch,
  HaystackSyncCursor,
} from "@openbeam/types/services/connectors/haystack";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: HaystackSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): HaystackSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
