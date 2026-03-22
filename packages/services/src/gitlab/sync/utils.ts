import type {
  GitLabSyncBatch,
  GitLabSyncCursor,
} from "@openbeam/types/services/connectors/gitlab";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: GitLabSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): GitLabSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
