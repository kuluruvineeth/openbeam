import type {
  SmartThingsSyncBatch,
  SmartThingsSyncCursor,
} from "@openbeam/types/services/connectors/smartthings";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: SmartThingsSyncCursor,
  stage: string,
  hasMore: boolean
): SmartThingsSyncBatch<GenericDocument> {
  return { items, cursor, stage, hasMore };
}
