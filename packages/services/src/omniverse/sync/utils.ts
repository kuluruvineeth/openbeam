import type {
  OmniverseSyncBatch,
  OmniverseSyncCursor,
} from "@openplane/types/services/connectors/omniverse";
import type { GenericDocument } from "@openplane/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: OmniverseSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): OmniverseSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
