import type {
  FreshserviceSyncBatch,
  FreshserviceSyncCursor,
} from "@openbeam/types/services/connectors/freshservice";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: FreshserviceSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): FreshserviceSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
