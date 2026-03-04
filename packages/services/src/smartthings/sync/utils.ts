import type {
  SmartThingsSyncBatch,
  SmartThingsSyncCursor,
} from "@openplane/types/services/connectors/smartthings";
import type { GenericDocument } from "@openplane/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: SmartThingsSyncCursor,
  stage: string,
  hasMore: boolean
): SmartThingsSyncBatch<GenericDocument> {
  return { items, cursor, stage, hasMore };
}
