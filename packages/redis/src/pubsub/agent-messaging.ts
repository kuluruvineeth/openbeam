import {
  type AgentMessageEnvelope,
  AgentMessageEnvelopeSchema,
  type AgentMessagePriority,
  BROADCAST_RECIPIENT,
} from "@openplane/types/temporal/mission-messaging";
import type { RedisClientType } from "redis";
import { getRedisClient } from "../client";
import { redisLogger } from "../lib/logger";
import { DeadLetterProcessor } from "./dead-letter";
import { getMessagingMetricsHook } from "./messaging-metrics";

const CONSUMER_GROUP = "mission-workers";
const STREAM_TTL_SECONDS = 4 * 60 * 60;
const MAX_STREAM_LENGTH = 1000;
const BLOCK_MS = 5000;

export const DEDUP_TTL_SECONDS = 3600;
const DEDUP_KEY_PREFIX = "agent-msg-dedup";

const RATE_LIMIT_KEY_PREFIX = "agent-rate";

export const AGENT_MSG_RATE_LIMIT = {
  maxPerSecond: 10,
  maxPerMinute: 200,
  maxPerMission: 5000,
} as const;

export type RateLimitWindow = "second" | "minute" | "mission";

export type RateLimitResult = {
  allowed: boolean;
  deniedBy?: RateLimitWindow;
  counts: Record<RateLimitWindow, number>;
};

export type RateLimitConfig = {
  maxPerSecond: number;
  maxPerMinute: number;
  maxPerMission: number;
};

export class MessageRateLimiter {
  private readonly limits: RateLimitConfig;

  constructor(limits: RateLimitConfig = AGENT_MSG_RATE_LIMIT) {
    this.limits = limits;
  }

  async checkAndIncrement(
    missionId: string,
    senderId: string
  ): Promise<RateLimitResult> {
    const client = await getRedisClient();
    const base = `${RATE_LIMIT_KEY_PREFIX}:${missionId}:${senderId}`;

    const secondKey = `${base}:s`;
    const minuteKey = `${base}:m`;
    const missionKey = `${base}:total`;

    const [secondCount, minuteCount, missionCount] = await Promise.all([
      client.incr(secondKey),
      client.incr(minuteKey),
      client.incr(missionKey),
    ]);

    if (secondCount === 1) {
      await client.expire(secondKey, 1);
    }
    if (minuteCount === 1) {
      await client.expire(minuteKey, 60);
    }
    if (missionCount === 1) {
      await client.expire(missionKey, STREAM_TTL_SECONDS);
    }

    const counts: Record<RateLimitWindow, number> = {
      second: secondCount,
      minute: minuteCount,
      mission: missionCount,
    };

    if (secondCount > this.limits.maxPerSecond) {
      return { allowed: false, deniedBy: "second", counts };
    }

    if (minuteCount > this.limits.maxPerMinute) {
      return { allowed: false, deniedBy: "minute", counts };
    }

    if (missionCount > this.limits.maxPerMission) {
      return { allowed: false, deniedBy: "mission", counts };
    }

    return { allowed: true, counts };
  }
}

export class MessageDeduplicator {
  async isDuplicate(messageId: string): Promise<boolean> {
    const client = await getRedisClient();
    const key = `${DEDUP_KEY_PREFIX}:${messageId}`;
    const result = await client.set(key, "1", {
      EX: DEDUP_TTL_SECONDS,
      NX: true,
    });
    return result !== "OK";
  }
}

export const PRIORITY_ORDER: AgentMessagePriority[] = [
  "critical",
  "high",
  "normal",
  "low",
];

export const PRIORITY_BATCH_SIZES: Record<AgentMessagePriority, number> = {
  critical: 100,
  high: 50,
  normal: 10,
  low: 5,
};

function directStreamKey(missionId: string, agentId: string): string {
  return `agent-stream:${missionId}:${agentId}`;
}

function broadcastStreamKey(missionId: string): string {
  return `agent-stream:${missionId}:${BROADCAST_RECIPIENT}`;
}

export function priorityStreamKey(
  missionId: string,
  agentId: string,
  priority: AgentMessagePriority
): string {
  return `agent-stream:${missionId}:${agentId}:${priority}`;
}

function priorityBroadcastStreamKey(
  missionId: string,
  priority: AgentMessagePriority
): string {
  return `agent-stream:${missionId}:${BROADCAST_RECIPIENT}:${priority}`;
}

function parseEnvelope(raw: string): AgentMessageEnvelope | null {
  try {
    return AgentMessageEnvelopeSchema.parse(JSON.parse(raw));
  } catch (error) {
    redisLogger.warn("agent message parse failed", {
      error: redisLogger.formatError(error),
    });
    return null;
  }
}

export class MessageRateLimitError extends Error {
  readonly missionId: string;
  readonly senderId: string;
  readonly deniedBy: RateLimitWindow;
  readonly counts: Record<RateLimitWindow, number>;

  constructor(
    missionId: string,
    senderId: string,
    deniedBy: RateLimitWindow,
    counts: Record<RateLimitWindow, number>
  ) {
    super(
      `Rate limit exceeded for agent ${senderId} in mission ${missionId}: ${deniedBy} limit hit (${counts[deniedBy]})`
    );
    this.name = "MessageRateLimitError";
    this.missionId = missionId;
    this.senderId = senderId;
    this.deniedBy = deniedBy;
    this.counts = counts;
  }
}

const defaultRateLimiter = new MessageRateLimiter();

export async function publishAgentMessage(
  envelope: AgentMessageEnvelope,
  rateLimiter: MessageRateLimiter = defaultRateLimiter
): Promise<string> {
  const client = await getRedisClient();
  const missionId = envelope.message.missionId;
  const senderId = envelope.message.senderId;
  const recipientId = envelope.message.recipientId;
  const priority = envelope.message.priority ?? "normal";

  const rateResult = await rateLimiter.checkAndIncrement(missionId, senderId);
  if (!rateResult.allowed) {
    const deniedBy = rateResult.deniedBy ?? "second";
    getMessagingMetricsHook().onRateLimited(missionId, senderId, deniedBy);
    redisLogger.warn("agent message rate limited", {
      missionId,
      senderId,
      deniedBy,
      counts: rateResult.counts,
    });
    throw new MessageRateLimitError(
      missionId,
      senderId,
      deniedBy,
      rateResult.counts
    );
  }

  if (envelope.message.replyToMessageId && !envelope.message.threadRootId) {
    envelope.message.threadRootId = envelope.message.replyToMessageId;
  }

  const serialized = JSON.stringify(envelope);

  const streamKey =
    recipientId === BROADCAST_RECIPIENT
      ? priorityBroadcastStreamKey(missionId, priority)
      : priorityStreamKey(missionId, recipientId, priority);

  const messageId = await client.xAdd(
    streamKey,
    "*",
    { data: serialized },
    {
      TRIM: {
        strategy: "MAXLEN",
        strategyModifier: "~",
        threshold: MAX_STREAM_LENGTH,
      },
    }
  );

  await client.expire(streamKey, STREAM_TTL_SECONDS);

  getMessagingMetricsHook().onPublished(missionId);

  return messageId;
}

async function ensureConsumerGroup(
  client: RedisClientType,
  streamKey: string,
  groupName: string
): Promise<void> {
  try {
    await client.xGroupCreate(streamKey, groupName, "0", { MKSTREAM: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("BUSYGROUP")) {
      throw error;
    }
  }
}

export type StreamConsumerOptions = {
  onError?: (error: Error) => void;
  onDeadLetter?: (entry: {
    streamKey: string;
    messageId: string;
    envelope: AgentMessageEnvelope;
  }) => void;
};

export type StreamConsumer = {
  stop: () => void;
  isRunning: boolean;
};

export async function createAgentStreamConsumer(
  missionId: string,
  agentId: string,
  onMessage: (envelope: AgentMessageEnvelope) => void,
  onErrorOrOptions?: ((error: Error) => void) | StreamConsumerOptions
): Promise<StreamConsumer> {
  const client = await getRedisClient();
  const consumerName = `consumer-${agentId}-${Date.now()}`;
  const dedup = new MessageDeduplicator();

  const options: StreamConsumerOptions =
    typeof onErrorOrOptions === "function"
      ? { onError: onErrorOrOptions }
      : (onErrorOrOptions ?? {});

  const priorityDirectKeys = PRIORITY_ORDER.map((p) =>
    priorityStreamKey(missionId, agentId, p)
  );
  const priorityBroadcastKeys = PRIORITY_ORDER.map((p) =>
    priorityBroadcastStreamKey(missionId, p)
  );
  const legacyDirectKey = directStreamKey(missionId, agentId);
  const legacyBroadcastKey = broadcastStreamKey(missionId);

  const allStreamKeys = [
    ...priorityDirectKeys,
    ...priorityBroadcastKeys,
    legacyDirectKey,
    legacyBroadcastKey,
  ];

  for (const key of allStreamKeys) {
    await ensureConsumerGroup(client, key, CONSUMER_GROUP);
  }

  const consumer: StreamConsumer = {
    stop: () => {
      consumer.isRunning = false;
    },
    isRunning: true,
  };

  const processEntry = async (
    streamName: string,
    entry: { id: string; message: Record<string, string> }
  ): Promise<void> => {
    const raw = entry.message.data;
    if (typeof raw !== "string") {
      await client.xAck(streamName, CONSUMER_GROUP, entry.id);
      return;
    }

    const parsed = parseEnvelope(raw);
    if (!parsed) {
      await client.xAck(streamName, CONSUMER_GROUP, entry.id);
      return;
    }

    if (parsed.message.expiresAt && Date.now() > parsed.message.expiresAt) {
      await client.xAck(streamName, CONSUMER_GROUP, entry.id);
      return;
    }

    const dedupId = parsed.requestId ?? parsed.message.id;
    if (await dedup.isDuplicate(dedupId)) {
      getMessagingMetricsHook().onDeduplicated(
        parsed.message.missionId,
        dedupId
      );
      await client.xAck(streamName, CONSUMER_GROUP, entry.id);
      return;
    }

    onMessage(parsed);
    await client.xAck(streamName, CONSUMER_GROUP, entry.id);
  };

  const dlqProcessors = priorityDirectKeys.map(
    (key) => new DeadLetterProcessor(key, CONSUMER_GROUP, consumerName)
  );

  const DLQ_RECLAIM_INTERVAL = 10;
  let loopIteration = 0;

  const reclaimStaleMessages = async () => {
    for (let i = 0; i < dlqProcessors.length; i++) {
      const processor = dlqProcessors[i];
      if (!processor) {
        continue;
      }
      const result = await processor.reclaimStale();
      if (result.deadLettered > 0) {
        redisLogger.warn("messages dead-lettered during reclaim", {
          missionId,
          agentId,
          streamKey: priorityDirectKeys[i],
          deadLettered: result.deadLettered,
          reclaimed: result.reclaimed,
        });
      }
    }
  };

  const readLoop = async () => {
    while (consumer.isRunning) {
      try {
        loopIteration += 1;

        if (loopIteration % DLQ_RECLAIM_INTERVAL === 0) {
          await reclaimStaleMessages();
        }

        let processedAny = false;

        for (const priority of PRIORITY_ORDER) {
          const directKey = priorityStreamKey(missionId, agentId, priority);
          const broadcastKey = priorityBroadcastStreamKey(missionId, priority);
          const batchSize = PRIORITY_BATCH_SIZES[priority];

          const streams = await client.xReadGroup(
            CONSUMER_GROUP,
            consumerName,
            [
              { key: directKey, id: ">" },
              { key: broadcastKey, id: ">" },
            ],
            { COUNT: batchSize, BLOCK: 0 }
          );

          if (streams) {
            for (const stream of streams) {
              for (const entry of stream.messages) {
                await processEntry(stream.name, entry);
              }
            }
            const totalMessages = streams.reduce(
              (sum, s) => sum + s.messages.length,
              0
            );
            if (totalMessages > 0) {
              processedAny = true;
              break;
            }
          }
        }

        if (!processedAny) {
          const legacyStreams = await client.xReadGroup(
            CONSUMER_GROUP,
            consumerName,
            [
              { key: legacyDirectKey, id: ">" },
              { key: legacyBroadcastKey, id: ">" },
            ],
            { COUNT: 10, BLOCK: BLOCK_MS }
          );

          if (legacyStreams) {
            for (const stream of legacyStreams) {
              for (const entry of stream.messages) {
                await processEntry(stream.name, entry);
              }
            }
          }
        }
      } catch (error) {
        if (!consumer.isRunning) {
          break;
        }
        options.onError?.(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  };

  readLoop().catch(() => {
    consumer.isRunning = false;
  });

  return consumer;
}

export async function getAgentMessageHistory(
  missionId: string,
  agentId: string,
  limit = 50
): Promise<AgentMessageEnvelope[]> {
  const client = await getRedisClient();
  const safeLimit = Math.max(1, Math.floor(limit));

  const streamKeys = [
    ...PRIORITY_ORDER.map((p) => priorityStreamKey(missionId, agentId, p)),
    ...PRIORITY_ORDER.map((p) => priorityBroadcastStreamKey(missionId, p)),
    directStreamKey(missionId, agentId),
    broadcastStreamKey(missionId),
  ];

  const allEntries = await Promise.all(
    streamKeys.map((key) => client.xRange(key, "-", "+", { COUNT: safeLimit }))
  );

  const envelopes: AgentMessageEnvelope[] = [];

  for (const entries of allEntries) {
    for (const entry of entries) {
      const raw = entry.message.data;
      if (typeof raw !== "string") {
        continue;
      }
      const parsed = parseEnvelope(raw);
      if (parsed) {
        envelopes.push(parsed);
      }
    }
  }

  envelopes.sort((a, b) => b.message.createdAt - a.message.createdAt);
  return envelopes.slice(0, safeLimit);
}

export async function getMessageThread(
  missionId: string,
  agentId: string,
  threadRootId: string,
  limit = 100
): Promise<AgentMessageEnvelope[]> {
  const history = await getAgentMessageHistory(missionId, agentId, limit);
  return history.filter(
    (envelope) =>
      envelope.message.id === threadRootId ||
      envelope.message.threadRootId === threadRootId
  );
}

export async function cleanupMissionStreams(
  missionId: string,
  agentIds: string[]
): Promise<number> {
  const client = await getRedisClient();

  const keysToDelete: string[] = [];

  for (const agentId of agentIds) {
    for (const priority of PRIORITY_ORDER) {
      keysToDelete.push(priorityStreamKey(missionId, agentId, priority));
      keysToDelete.push(
        `${priorityStreamKey(missionId, agentId, priority)}:dlq`
      );
    }
    keysToDelete.push(directStreamKey(missionId, agentId));
  }

  for (const priority of PRIORITY_ORDER) {
    keysToDelete.push(priorityBroadcastStreamKey(missionId, priority));
    keysToDelete.push(`${priorityBroadcastStreamKey(missionId, priority)}:dlq`);
  }

  keysToDelete.push(broadcastStreamKey(missionId));

  let deleted = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < keysToDelete.length; i += BATCH_SIZE) {
    const batch = keysToDelete.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((key) => client.del(key)));
    deleted += results.reduce((sum, r) => sum + r, 0);
  }

  redisLogger.info("mission streams cleaned up", {
    missionId,
    agentCount: agentIds.length,
    keysAttempted: keysToDelete.length,
    keysDeleted: deleted,
  });

  return deleted;
}
