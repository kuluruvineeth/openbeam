import type {
  OpcUaSyncBatch,
  OpcUaSyncCursor,
} from "@openplane/types/services/connectors/opcua";
import type { GenericDocument } from "@openplane/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: OpcUaSyncCursor,
  stage: string,
  hasMore: boolean
): OpcUaSyncBatch<GenericDocument> {
  return { items, cursor, stage, hasMore };
}
