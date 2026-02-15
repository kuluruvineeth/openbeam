import {
  type AgentMessageEnvelope,
  AgentMessageEnvelopeSchema,
  type DLQEntry,
} from "@openplane/types/temporal/mission-messaging";
import { getRedisClient } from "../client";
import { redisLogger } from "../lib/logger";
import { getMessagingMetricsHook } from "./messaging-metrics";

export const MAX_DELIVERY_ATTEMPTS = 3;
export const CLAIM_IDLE_MS = 60_000;
const DLQ_STREAM_TTL_SECONDS = 24 * 60 * 60;
const DLQ_MAX_LENGTH = 5000;

function dlqStreamKey(streamKey: string): string {
  return `${streamKey}:dlq`;
}

export class DeadLetterProcessor {
  private readonly streamKey: string;
  private readonly groupName: string;
  private readonly consumerName: string;

  constructor(streamKey: string, groupName: string, consumerName: string) {
    this.streamKey = streamKey;
    this.groupName = groupName;
    this.consumerName = consumerName;
  }

  async reclaimStale(): Promise<{ reclaimed: number; deadLettered: number }> {
    const client = await getRedisClient();
    let reclaimed = 0;
    let deadLettered = 0;

    try {
      const result = await client.xAutoClaim(
        this.streamKey,
        this.groupName,
        this.consumerName,
        CLAIM_IDLE_MS,
        "0-0",
        { COUNT: 50 }
      );

      if (!result.messages || result.messages.length === 0) {
        return { reclaimed: 0, deadLettered: 0 };
      }

      for (const message of result.messages) {
        if (!message) {
          continue;
        }

        const pendingEntries = await client.xPendingRange(
          this.streamKey,
          this.groupName,
          message.id,
          message.id,
          1
        );

        const deliveryCount =
          pendingEntries.length > 0
            ? (pendingEntries[0]?.deliveriesCounter ?? 1)
            : 1;

        if (deliveryCount > MAX_DELIVERY_ATTEMPTS) {
          await this.moveToDeadLetter(
            client,
            message.id,
            message.message,
            deliveryCount
          );
          deadLettered += 1;
        } else {
          reclaimed += 1;
        }
      }
    } catch (error) {
      redisLogger.warn("DLQ reclaim failed", {
        streamKey: this.streamKey,
        error: redisLogger.formatError(error),
      });
    }

    if (reclaimed > 0) {
      getMessagingMetricsHook().onReclaimed(this.streamKey, reclaimed);
    }

    return { reclaimed, deadLettered };
  }

  private async moveToDeadLetter(
    client: Awaited<ReturnType<typeof getRedisClient>>,
    messageId: string,
    rawMessage: Record<string, string>,
    deliveryCount: number
  ): Promise<void> {
    const dlqKey = dlqStreamKey(this.streamKey);
    const raw = rawMessage.data;

    let envelope: AgentMessageEnvelope | null = null;
    if (typeof raw === "string") {
      try {
        envelope = AgentMessageEnvelopeSchema.parse(JSON.parse(raw));
      } catch {
        envelope = null;
      }
    }

    const dlqEntry: DLQEntry = {
      originalStreamKey: this.streamKey,
      originalMessageId: messageId,
      envelope: envelope ?? {
        message: {
          id: `unknown-${messageId}`,
          missionId: "unknown",
          senderId: "unknown",
          recipientId: "unknown",
          kind: "direct",
          priority: "normal",
          subject: "dead-lettered",
          body: raw,
          createdAt: Date.now(),
        },
      },
      deliveryAttempts: deliveryCount,
      deadLetteredAt: Date.now(),
      reason: `Exceeded max delivery attempts (${MAX_DELIVERY_ATTEMPTS})`,
    };

    await client.xAdd(
      dlqKey,
      "*",
      { data: JSON.stringify(dlqEntry) },
      {
        TRIM: {
          strategy: "MAXLEN",
          strategyModifier: "~",
          threshold: DLQ_MAX_LENGTH,
        },
      }
    );

    await client.expire(dlqKey, DLQ_STREAM_TTL_SECONDS);
    await client.xAck(this.streamKey, this.groupName, messageId);

    getMessagingMetricsHook().onDeadLettered(this.streamKey);
  }

  async getDLQMessages(limit = 50): Promise<DLQEntry[]> {
    const client = await getRedisClient();
    const dlqKey = dlqStreamKey(this.streamKey);
    const safeLimit = Math.max(1, Math.floor(limit));
    const entries = await client.xRange(dlqKey, "-", "+", { COUNT: safeLimit });

    const results: DLQEntry[] = [];
    for (const entry of entries) {
      const raw = entry.message.data;
      if (typeof raw !== "string") {
        continue;
      }
      try {
        const parsed = JSON.parse(raw) as DLQEntry;
        results.push(parsed);
      } catch (error) {
        redisLogger.warn("DLQ entry parse failed", {
          streamKey: dlqKey,
          error: redisLogger.formatError(error),
        });
      }
    }

    return results;
  }

  async ackDLQMessage(messageId: string): Promise<void> {
    const client = await getRedisClient();
    const dlqKey = dlqStreamKey(this.streamKey);
    await client.xDel(dlqKey, messageId);
  }

  async reprocessDLQMessage(dlqMessageId: string): Promise<string | null> {
    const client = await getRedisClient();
    const dlqKey = dlqStreamKey(this.streamKey);

    const entries = await client.xRange(dlqKey, dlqMessageId, dlqMessageId, {
      COUNT: 1,
    });
    if (entries.length === 0) {
      return null;
    }

    const raw = entries[0]?.message.data;
    if (typeof raw !== "string") {
      return null;
    }

    let dlqEntry: DLQEntry;
    try {
      dlqEntry = JSON.parse(raw) as DLQEntry;
    } catch {
      return null;
    }

    const serialized = JSON.stringify(dlqEntry.envelope);
    const newId = await client.xAdd(this.streamKey, "*", { data: serialized });

    await client.xDel(dlqKey, dlqMessageId);

    getMessagingMetricsHook().onReprocessed(this.streamKey);

    redisLogger.info("DLQ message reprocessed", {
      streamKey: this.streamKey,
      dlqMessageId,
      newStreamId: newId,
    });

    return newId;
  }

  async getDLQDepth(): Promise<number> {
    const client = await getRedisClient();
    const dlqKey = dlqStreamKey(this.streamKey);
    return client.xLen(dlqKey);
  }
}
