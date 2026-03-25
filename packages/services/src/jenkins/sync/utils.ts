import type {
  JenkinsSyncBatch,
  JenkinsSyncCursor,
} from "@openbeam/types/services/connectors/jenkins";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: JenkinsSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): JenkinsSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
