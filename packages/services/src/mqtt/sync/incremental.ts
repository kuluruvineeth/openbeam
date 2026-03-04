import type {
  MqttSyncCursor,
  MqttTransformContext,
} from "@openplane/types/services/connectors/mqtt";
import type { GenericDocument } from "@openplane/vespa";
import type { MqttConnectorClient } from "../client";
import { transformMessages } from "../transformers/message";
import { createSyncBatch, type MqttSyncBatch } from "./utils";

interface IncrementalSyncOptions {
  batchSize?: number;
  durationMs?: number;
}

interface CollectedMessage {
  topic: string;
  payload: Record<string, unknown>;
  timestamp: number;
  qos: number;
  retain: boolean;
}

export async function* incrementalSync(
  _client: MqttConnectorClient,
  context: MqttTransformContext,
  options: IncrementalSyncOptions = {}
): AsyncGenerator<MqttSyncBatch, void, undefined> {
  const { batchSize = 100, durationMs = 60_000 } = options;

  const messages: CollectedMessage[] = [];
  const cursor: MqttSyncCursor = { lastSyncTime: Date.now() };

  const startTime = Date.now();

  while (Date.now() - startTime < durationMs) {
    if (messages.length >= batchSize) {
      const batch = messages.splice(0, batchSize);
      const documents: GenericDocument[] = await transformMessages(
        batch,
        context
      );

      cursor.lastMessageTimestamp = batch.at(-1)?.timestamp;
      yield createSyncBatch(documents, cursor, "messages", true);
    }

    await sleep(1000);
  }

  if (messages.length > 0) {
    const documents = await transformMessages(messages, context);
    cursor.lastMessageTimestamp = messages.at(-1)?.timestamp;
    yield createSyncBatch(documents, cursor, "messages", false);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
