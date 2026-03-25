import type {
  MindtickleSyncBatch,
  MindtickleSyncCursor,
} from "@openbeam/types/services/connectors/mindtickle";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: MindtickleSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): MindtickleSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
