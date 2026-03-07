import type {
  AwsIotSyncBatch,
  AwsIotSyncCursor,
} from "@openbeam/types/services/connectors/aws-iot";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: AwsIotSyncCursor,
  stage: string,
  hasMore: boolean
): AwsIotSyncBatch<GenericDocument> {
  return { items, cursor, stage, hasMore };
}
