import type {
  BenchlingSyncBatch,
  BenchlingSyncCursor,
} from "@openbeam/types/services/connectors/benchling";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: BenchlingSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): BenchlingSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
