import type {
  LoopioSyncBatch,
  LoopioSyncCursor,
} from "@openbeam/types/services/connectors/loopio";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: LoopioSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): LoopioSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
