import type {
  AzureIotSyncBatch,
  AzureIotSyncCursor,
} from "@openbeam/types/services/connectors/azure-iot";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: AzureIotSyncCursor,
  stage: string,
  hasMore: boolean
): AzureIotSyncBatch<GenericDocument> {
  return { items, cursor, stage, hasMore };
}
