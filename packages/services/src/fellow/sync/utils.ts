import type {
  FellowSyncBatch,
  FellowSyncCursor,
} from "@openbeam/types/services/connectors/fellow";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: FellowSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): FellowSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
