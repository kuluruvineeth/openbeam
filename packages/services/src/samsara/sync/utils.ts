import type {
  SamsaraSyncBatch,
  SamsaraSyncCursor,
} from "@openplane/types/services/connectors/samsara";
import type { GenericDocument } from "@openplane/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: SamsaraSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): SamsaraSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
