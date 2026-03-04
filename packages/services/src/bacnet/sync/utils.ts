import type {
  BacnetSyncBatch,
  BacnetSyncCursor,
} from "@openplane/types/services/connectors/bacnet";
import type { GenericDocument } from "@openplane/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: BacnetSyncCursor,
  stage: string,
  hasMore: boolean
): BacnetSyncBatch<GenericDocument> {
  return { items, cursor, stage, hasMore };
}
