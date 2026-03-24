import type {
  AhaSyncBatch,
  AhaSyncCursor,
} from "@openbeam/types/services/connectors/aha";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: AhaSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): AhaSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
