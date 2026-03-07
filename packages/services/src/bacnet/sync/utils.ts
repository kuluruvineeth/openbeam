import type {
  BacnetSyncBatch,
  BacnetSyncCursor,
} from "@openbeam/types/services/connectors/bacnet";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: BacnetSyncCursor,
  stage: string,
  hasMore: boolean
): BacnetSyncBatch<GenericDocument> {
  return { items, cursor, stage, hasMore };
}
