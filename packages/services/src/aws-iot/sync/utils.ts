import type {
  AwsIotSyncBatch,
  AwsIotSyncCursor,
} from "@openplane/types/services/connectors/aws-iot";
import type { GenericDocument } from "@openplane/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: AwsIotSyncCursor,
  stage: string,
  hasMore: boolean
): AwsIotSyncBatch<GenericDocument> {
  return { items, cursor, stage, hasMore };
}
