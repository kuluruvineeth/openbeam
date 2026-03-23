import type {
  GongSyncBatch,
  GongSyncCursor,
} from "@openbeam/types/services/connectors/gong";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: GongSyncCursor,
  stage: string,
  hasMore: boolean
): GongSyncBatch<GenericDocument> {
  return { items, cursor, stage, hasMore };
}
