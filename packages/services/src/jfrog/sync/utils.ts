import type {
  JFrogSyncBatch,
  JFrogSyncCursor,
} from "@openbeam/types/services/connectors/jfrog";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: JFrogSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): JFrogSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
