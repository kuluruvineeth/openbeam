import type {
  AmplitudeSyncBatch,
  AmplitudeSyncCursor,
} from "@openbeam/types/services/connectors/amplitude";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: AmplitudeSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): AmplitudeSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
