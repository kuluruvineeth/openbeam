import type {
  MatterportSyncBatch,
  MatterportSyncCursor,
} from "@openplane/types/services/connectors/matterport";
import type { GenericDocument } from "@openplane/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: MatterportSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): MatterportSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
