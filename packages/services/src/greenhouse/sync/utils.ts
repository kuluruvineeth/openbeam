import type {
  GreenhouseSyncBatch,
  GreenhouseSyncCursor,
} from "@openbeam/types/services/connectors/greenhouse";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: GreenhouseSyncCursor,
  stage: string,
  hasMore: boolean
): GreenhouseSyncBatch<GenericDocument> {
  return { items, cursor, stage, hasMore };
}
