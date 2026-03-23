import type {
  S3SyncBatch,
  S3SyncCursor,
} from "@openbeam/types/services/connectors/s3";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: S3SyncCursor,
  stage: string,
  hasMore: boolean
): S3SyncBatch<GenericDocument> {
  return { items, cursor, stage, hasMore };
}
