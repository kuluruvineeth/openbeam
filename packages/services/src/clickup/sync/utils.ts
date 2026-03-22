import type {
  ClickUpSyncBatch,
  ClickUpSyncCursor,
} from "@openbeam/types/services/connectors/clickup";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: ClickUpSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): ClickUpSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
