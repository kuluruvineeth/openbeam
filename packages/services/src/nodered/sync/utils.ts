import type {
  NodeRedSyncBatch,
  NodeRedSyncCursor,
} from "@openbeam/types/services/connectors/nodered";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: NodeRedSyncCursor,
  stage: string,
  hasMore: boolean
): NodeRedSyncBatch<GenericDocument> {
  return { items, cursor, stage, hasMore };
}
