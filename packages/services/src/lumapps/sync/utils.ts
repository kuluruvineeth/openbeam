import type {
  LumAppsSyncBatch,
  LumAppsSyncCursor,
} from "@openbeam/types/services/connectors/lumapps";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: LumAppsSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): LumAppsSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
