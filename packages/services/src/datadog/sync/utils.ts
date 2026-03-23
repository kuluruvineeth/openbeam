import type {
  DatadogSyncBatch,
  DatadogSyncCursor,
} from "@openbeam/types/services/connectors/datadog";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: DatadogSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): DatadogSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
