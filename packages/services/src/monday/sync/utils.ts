import type {
  MondaySyncBatch,
  MondaySyncCursor,
} from "@openbeam/types/services/connectors/monday";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: MondaySyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): MondaySyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
