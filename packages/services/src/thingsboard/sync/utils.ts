import type {
  ThingsboardSyncBatch,
  ThingsboardSyncCursor,
} from "@openbeam/types/services/connectors/thingsboard";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: ThingsboardSyncCursor,
  stage: string,
  hasMore: boolean
): ThingsboardSyncBatch<GenericDocument> {
  return { items, cursor, stage, hasMore };
}
