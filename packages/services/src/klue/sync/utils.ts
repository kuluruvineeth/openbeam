import type {
  KlueSyncBatch,
  KlueSyncCursor,
} from "@openbeam/types/services/connectors/klue";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: KlueSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): KlueSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
