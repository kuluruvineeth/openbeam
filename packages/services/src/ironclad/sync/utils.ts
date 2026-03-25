import type {
  IroncladSyncBatch,
  IroncladSyncCursor,
} from "@openbeam/types/services/connectors/ironclad";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: IroncladSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): IroncladSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
