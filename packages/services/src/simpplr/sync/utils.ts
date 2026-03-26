import type {
  SimpplrSyncBatch,
  SimpplrSyncCursor,
} from "@openbeam/types/services/connectors/simpplr";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: SimpplrSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): SimpplrSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
