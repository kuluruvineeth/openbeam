import type {
  InsidedSyncBatch,
  InsidedSyncCursor,
} from "@openbeam/types/services/connectors/insided";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: InsidedSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): InsidedSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
