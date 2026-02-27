import type {
  GitHubSyncBatch,
  GitHubSyncCursor,
} from "@openplane/types/services/connectors/github";
import type { GenericDocument } from "@openplane/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: GitHubSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): GitHubSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
