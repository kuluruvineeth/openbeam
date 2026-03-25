import type {
  InteractSyncBatch,
  InteractSyncCursor,
} from "@openbeam/types/services/connectors/interact";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: InteractSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): InteractSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
