import type {
  PagerDutySyncBatch,
  PagerDutySyncCursor,
} from "@openbeam/types/services/connectors/pagerduty";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: PagerDutySyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): PagerDutySyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
