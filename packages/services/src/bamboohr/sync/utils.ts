import type {
  BambooHRSyncBatch,
  BambooHRSyncCursor,
} from "@openbeam/types/services/connectors/bamboohr";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: BambooHRSyncCursor,
  stage: string,
  hasMore: boolean
): BambooHRSyncBatch<GenericDocument> {
  return { items, cursor, stage, hasMore };
}
