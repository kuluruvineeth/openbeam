import type {
  VerkadaSyncBatch,
  VerkadaSyncCursor,
} from "@openplane/types/services/connectors/verkada";
import type { GenericDocument } from "@openplane/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: VerkadaSyncCursor,
  stage: VerkadaSyncBatch<GenericDocument>["stage"],
  hasMore: boolean
): VerkadaSyncBatch<GenericDocument> {
  return { items, cursor, stage, hasMore };
}
