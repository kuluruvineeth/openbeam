import type {
  OpsGenieSyncBatch,
  OpsGenieSyncCursor,
} from "@openbeam/types/services/connectors/opsgenie";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: OpsGenieSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): OpsGenieSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
