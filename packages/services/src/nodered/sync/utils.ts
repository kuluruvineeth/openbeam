import type {
  NodeRedSyncBatch,
  NodeRedSyncCursor,
} from "@openplane/types/services/connectors/nodered";
import type { GenericDocument } from "@openplane/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: NodeRedSyncCursor,
  stage: string,
  hasMore: boolean
): NodeRedSyncBatch<GenericDocument> {
  return { items, cursor, stage, hasMore };
}
