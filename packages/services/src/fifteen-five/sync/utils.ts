import type {
  FifteenFiveSyncBatch,
  FifteenFiveSyncCursor,
} from "@openbeam/types/services/connectors/fifteen-five";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: FifteenFiveSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): FifteenFiveSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
