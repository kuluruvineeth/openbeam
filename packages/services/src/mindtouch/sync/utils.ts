import type {
  MindtouchSyncBatch,
  MindtouchSyncCursor,
} from "@openbeam/types/services/connectors/mindtouch";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: MindtouchSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): MindtouchSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
