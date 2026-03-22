import type {
  BitbucketSyncBatch,
  BitbucketSyncCursor,
} from "@openbeam/types/services/connectors/bitbucket";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: BitbucketSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): BitbucketSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
