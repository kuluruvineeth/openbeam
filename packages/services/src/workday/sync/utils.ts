import type {
  WorkdaySyncBatch,
  WorkdaySyncCursor,
} from "@openbeam/types/services/connectors/workday";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: WorkdaySyncCursor,
  stage: string,
  hasMore: boolean
): WorkdaySyncBatch<GenericDocument> {
  return { items, cursor, stage, hasMore };
}
