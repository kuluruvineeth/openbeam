import type {
  OpcUaSyncBatch,
  OpcUaSyncCursor,
} from "@openbeam/types/services/connectors/opcua";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: OpcUaSyncCursor,
  stage: string,
  hasMore: boolean
): OpcUaSyncBatch<GenericDocument> {
  return { items, cursor, stage, hasMore };
}
