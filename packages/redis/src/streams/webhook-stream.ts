import { getRedisClient } from "../client";

const WEBHOOK_STREAM = "stream:webhooks";
const WEBHOOK_DLQ = "stream:webhooks:dlq";
const MAX_STREAM_LENGTH = 100_000;
const DEDUPE_TTL_SECONDS = 86_400;

export interface WebhookStreamEntry {
  id: string;
  connectorType: string;
  connectorId: string;
  teamId: string;
  eventType: string;
  payload: string;
  receivedAt: string;
}

export async function publishWebhookEvent(
  entry: WebhookStreamEntry
): Promise<string> {
  const client = await getRedisClient();
  const streamId = await client.xAdd(
    WEBHOOK_STREAM,
    "*",
    entry as unknown as Record<string, string>,
    {
      TRIM: {
        strategy: "MAXLEN",
        strategyModifier: "~",
        threshold: MAX_STREAM_LENGTH,
      },
    }
  );
  return streamId;
}

export async function isDuplicateEvent(
  connectorType: string,
  eventId: string
): Promise<boolean> {
  const client = await getRedisClient();
  const key = `webhook:dedupe:${connectorType}:${eventId}`;
  const result = await client.set(key, "1", {
    NX: true,
    EX: DEDUPE_TTL_SECONDS,
  });
  return result === null;
}

export async function moveToDeadLetter(
  entry: WebhookStreamEntry
): Promise<void> {
  const client = await getRedisClient();
  await client.xAdd(WEBHOOK_DLQ, "*", {
    ...entry,
    failedAt: String(Date.now()),
  });
}

export async function getStreamLength(): Promise<number> {
  const client = await getRedisClient();
  return client.xLen(WEBHOOK_STREAM);
}
