import type {
  ThingsboardSyncBatch,
  ThingsboardSyncCursor,
} from "@openplane/types/services/connectors/thingsboard";
import type { GenericDocument } from "@openplane/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: ThingsboardSyncCursor,
  stage: string,
  hasMore: boolean
): ThingsboardSyncBatch<GenericDocument> {
  return { items, cursor, stage, hasMore };
}
