import type {
  ViamSyncBatch,
  ViamSyncCursor,
} from "@openplane/types/services/connectors/viam";
import type { GenericDocument } from "@openplane/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: ViamSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): ViamSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
