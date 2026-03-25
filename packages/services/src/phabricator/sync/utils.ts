import type {
  PhabricatorSyncBatch,
  PhabricatorSyncCursor,
} from "@openbeam/types/services/connectors/phabricator";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: PhabricatorSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): PhabricatorSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
