import type { MqttSyncCursor } from "@openbeam/types/services/connectors/mqtt";
import type { GenericDocument } from "@openbeam/vespa";

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
