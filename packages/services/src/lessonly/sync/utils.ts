import type {
  LessonlySyncBatch,
  LessonlySyncCursor,
} from "@openbeam/types/services/connectors/lessonly";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: LessonlySyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): LessonlySyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
