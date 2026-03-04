import type { MqttSyncCursor } from "@openplane/types/services/connectors/mqtt";
import type { GenericDocument } from "@openplane/vespa";

export interface MqttSyncBatch {
  items: GenericDocument[];
  cursor: MqttSyncCursor;
  stage: string;
  hasMore: boolean;
}

export function createSyncBatch(
  items: GenericDocument[],
  cursor: MqttSyncCursor,
  stage: string,
  hasMore: boolean
): MqttSyncBatch {
  return { items, cursor, stage, hasMore };
}
