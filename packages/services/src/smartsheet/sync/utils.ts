import type {
  SmartsheetSyncBatch,
  SmartsheetSyncCursor,
} from "@openbeam/types/services/connectors/smartsheet";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: SmartsheetSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): SmartsheetSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
