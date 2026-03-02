import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { AgentMessageEnvelope } from "@openplane/types/temporal/mission-messaging";

const incrCounts = new Map<string, number>();
const mockIncr = mock((key: string) => {
  const count = (incrCounts.get(key) ?? 0) + 1;
  incrCounts.set(key, count);
  return Promise.resolve(count);
});
const mockExpire = mock(() => Promise.resolve(true));

let xAddSeq = 0;
const publishedMessages: { key: string; data: string }[] = [];
const mockXAdd = mock(
  (key: string, _id: string, msg: Record<string, string>) => {
    xAddSeq += 1;
    publishedMessages.push({ key, data: msg.data ?? "" });
    return Promise.resolve(`${Date.now()}-${xAddSeq}`);
  }
);

const dedupStore = new Map<string, string>();
const mockSet = mock((key: string, _val: string, _opts?: unknown) => {
  if (dedupStore.has(key)) {
    return Promise.resolve(null);
  }
  dedupStore.set(key, "1");
  return Promise.resolve("OK");
});

const mockXGroupCreate = mock(() => Promise.resolve("OK"));
const mockXReadGroup = mock(() => Promise.resolve(null));
const mockXAck = mock(() => Promise.resolve(1));
const mockXRange = mock(
  (_key: string): Promise<{ id: string; message: Record<string, string> }[]> =>
    Promise.resolve([])
);
const mockXAutoClaim = mock(
  (): Promise<{
    nextId: string;
    messages: ({ id: string; message: Record<string, string> } | null)[];
  }> => Promise.resolve({ messages: [], nextId: "0-0" })
);
const mockXPendingRange = mock(
  (): Promise<
    { id: string; deliveriesCounter: number; name: string; idle: number }[]
  > => Promise.resolve([])
);
const mockXDel = mock(() => Promise.resolve(1));
const mockXLen = mock(() => Promise.resolve(0));
const mockDel = mock(() => Promise.resolve(1));

const mockRedisClient = {
  xAdd: mockXAdd,
  expire: mockExpire,
  xGroupCreate: mockXGroupCreate,
  xReadGroup: mockXReadGroup,
  xAck: mockXAck,
  xRange: mockXRange,
  set: mockSet,
  incr: mockIncr,
  xAutoClaim: mockXAutoClaim,
  xPendingRange: mockXPendingRange,
  xDel: mockXDel,
  xLen: mockXLen,
  del: mockDel,
};

mock.module("../../client", () => ({
  getRedisClient: () => Promise.resolve(mockRedisClient),
}));

const {
  publishAgentMessage,
  MessageRateLimiter,
  MessageRateLimitError,
  priorityStreamKey,
  cleanupMissionStreams,
  PRIORITY_ORDER,
} = await import("../agent-messaging");
const { DeadLetterProcessor } = await import("../dead-letter");
const { setMessagingMetricsHook, resetMessagingMetricsHook } = await import(
  "../messaging-metrics"
);

function createEnvelope(
  overrides?: Partial<{
    message: Partial<AgentMessageEnvelope["message"]>;
  }> &
    Omit<Partial<AgentMessageEnvelope>, "message">
): AgentMessageEnvelope {
  return {
    message: {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      missionId: "mission-stress",
      senderId: "agent-sender",
      recipientId: "agent-receiver",
      kind: "direct",
      priority: "normal",
      subject: "stress",
      body: {},
      createdAt: Date.now(),
      ...overrides?.message,
    },
    ...("requestId" in (overrides ?? {})
      ? { requestId: overrides?.requestId }
      : {}),
  };
}

const PERMISSIVE_LIMITER = new MessageRateLimiter({
  maxPerSecond: 100_000,
  maxPerMinute: 100_000,
  maxPerMission: 100_000,
});

describe("Swarm messaging stress tests", () => {
  beforeEach(() => {
    incrCounts.clear();
    xAddSeq = 0;
    publishedMessages.length = 0;
    dedupStore.clear();
    mockXAdd.mockClear();
    mockExpire.mockClear();
    mockIncr.mockClear();
    mockSet.mockClear();
    mockXAck.mockClear();
    mockXDel.mockClear();
    mockDel.mockClear();
    resetMessagingMetricsHook();
  });

  describe("rate limit enforcement under burst (100 messages from one agent)", () => {
    it("blocks messages beyond per-second limit", async () => {
      const limiter = new MessageRateLimiter({
        maxPerSecond: 10,
        maxPerMinute: 200,
        maxPerMission: 5000,
      });

      let delivered = 0;
      let rateLimited = 0;

      for (let i = 0; i < 100; i++) {
        const envelope = createEnvelope({
          message: {
            id: `burst-${i}`,
            senderId: "agent-spammer",
          },
        });

        try {
          await publishAgentMessage(envelope, limiter);
          delivered += 1;
        } catch (error) {
          if (error instanceof MessageRateLimitError) {
            rateLimited += 1;
            expect(error.deniedBy).toBe("second");
            expect(error.senderId).toBe("agent-spammer");
          } else {
            throw error;
          }
        }
      }

      expect(delivered).toBe(10);
      expect(rateLimited).toBe(90);
    });

    it("per-minute limit activates after second-limit window resets", async () => {
      const limiter = new MessageRateLimiter({
        maxPerSecond: 50,
        maxPerMinute: 20,
        maxPerMission: 5000,
      });

      let delivered = 0;
      let minuteLimited = 0;

      for (let i = 0; i < 50; i++) {
        const envelope = createEnvelope({
          message: { id: `min-burst-${i}`, senderId: "agent-chatty" },
        });

        try {
          await publishAgentMessage(envelope, limiter);
          delivered += 1;
        } catch (error) {
          if (
            error instanceof MessageRateLimitError &&
            error.deniedBy === "minute"
          ) {
            minuteLimited += 1;
          }
        }
      }

      expect(delivered).toBe(20);
      expect(minuteLimited).toBe(30);
    });

    it("mission-level limit enforces absolute cap", async () => {
      const limiter = new MessageRateLimiter({
        maxPerSecond: 1000,
        maxPerMinute: 1000,
        maxPerMission: 15,
      });

      let delivered = 0;
      let missionLimited = 0;

      for (let i = 0; i < 30; i++) {
        const envelope = createEnvelope({
          message: { id: `mission-${i}`, senderId: "agent-marathon" },
        });

        try {
          await publishAgentMessage(envelope, limiter);
          delivered += 1;
        } catch (error) {
          if (
            error instanceof MessageRateLimitError &&
            error.deniedBy === "mission"
          ) {
            missionLimited += 1;
          }
        }
      }

      expect(delivered).toBe(15);
      expect(missionLimited).toBe(15);
    });
  });

  describe("concurrent publish from 10 agents (50 messages each)", () => {
    it("publishes all messages to correct priority stream keys", async () => {
      const published: string[] = [];

      for (let agent = 0; agent < 10; agent++) {
        for (let msg = 0; msg < 50; msg++) {
          const priorities = ["critical", "high", "normal", "low"] as const;
          const priority = priorities[msg % 4] ?? "normal";
          const envelope = createEnvelope({
            message: {
              id: `agent-${agent}-msg-${msg}`,
              senderId: `agent-${agent}`,
              recipientId: `agent-target-${agent}`,
              priority,
            },
          });

          await publishAgentMessage(envelope, PERMISSIVE_LIMITER);
          published.push(
            priorityStreamKey(
              "mission-stress",
              `agent-target-${agent}`,
              priority
            )
          );
        }
      }

      expect(published).toHaveLength(500);
      expect(mockXAdd).toHaveBeenCalledTimes(500);

      const uniqueStreams = new Set(publishedMessages.map((m) => m.key));
      expect(uniqueStreams.size).toBe(40);
    });

    it("each agent's messages land on their own priority streams", async () => {
      for (let agent = 0; agent < 5; agent++) {
        for (let msg = 0; msg < 10; msg++) {
          const envelope = createEnvelope({
            message: {
              id: `r-${agent}-${msg}`,
              senderId: `sender-${agent}`,
              recipientId: `receiver-${agent}`,
              priority: "normal",
            },
          });
          await publishAgentMessage(envelope, PERMISSIVE_LIMITER);
        }
      }

      const streamCounts = new Map<string, number>();
      for (const { key } of publishedMessages) {
        streamCounts.set(key, (streamCounts.get(key) ?? 0) + 1);
      }

      for (let agent = 0; agent < 5; agent++) {
        const expectedKey = priorityStreamKey(
          "mission-stress",
          `receiver-${agent}`,
          "normal"
        );
        expect(streamCounts.get(expectedKey)).toBe(10);
      }
    });
  });

  describe("DLQ activation under delivery failures", () => {
    it("dead-letters messages exceeding MAX_DELIVERY_ATTEMPTS", async () => {
      const failingMessages = Array.from({ length: 20 }, (_, i) => ({
        id: `fail-${i}`,
        message: {
          data: JSON.stringify(
            createEnvelope({ message: { id: `fail-${i}` } })
          ),
        },
      }));

      mockXAutoClaim.mockResolvedValueOnce({
        messages: failingMessages,
        nextId: "0-0",
      });

      for (const msg of failingMessages) {
        mockXPendingRange.mockResolvedValueOnce([
          {
            id: msg.id,
            deliveriesCounter: 5,
            name: "consumer-1",
            idle: 120_000,
          },
        ]);
      }

      const processor = new DeadLetterProcessor(
        "agent-stream:mission-stress:agent-receiver:normal",
        "mission-workers",
        "consumer-1"
      );

      const result = await processor.reclaimStale();

      expect(result.deadLettered).toBe(20);
      expect(result.reclaimed).toBe(0);
      expect(mockXAdd).toHaveBeenCalledTimes(20);

      const dlqWrites = publishedMessages.filter((m) => m.key.endsWith(":dlq"));
      expect(dlqWrites).toHaveLength(20);
    });

    it("reclaims messages below delivery threshold without dead-lettering", async () => {
      const reclaimableMessages = Array.from({ length: 10 }, (_, i) => ({
        id: `reclaim-${i}`,
        message: {
          data: JSON.stringify(
            createEnvelope({ message: { id: `reclaim-${i}` } })
          ),
        },
      }));

      mockXAutoClaim.mockResolvedValueOnce({
        messages: reclaimableMessages,
        nextId: "0-0",
      });

      for (const msg of reclaimableMessages) {
        mockXPendingRange.mockResolvedValueOnce([
          {
            id: msg.id,
            deliveriesCounter: 2,
            name: "consumer-1",
            idle: 90_000,
          },
        ]);
      }

      const processor = new DeadLetterProcessor(
        "agent-stream:mission-stress:agent-receiver:normal",
        "mission-workers",
        "consumer-1"
      );

      const result = await processor.reclaimStale();

      expect(result.reclaimed).toBe(10);
      expect(result.deadLettered).toBe(0);
      expect(mockXAdd).not.toHaveBeenCalled();
    });

    it("mixed batch: some dead-lettered, some reclaimed", async () => {
      const messages = Array.from({ length: 15 }, (_, i) => ({
        id: `mixed-${i}`,
        message: {
          data: JSON.stringify(
            createEnvelope({ message: { id: `mixed-${i}` } })
          ),
        },
      }));

      mockXAutoClaim.mockResolvedValueOnce({
        messages,
        nextId: "0-0",
      });

      for (let i = 0; i < 15; i++) {
        const deliveryCount = i < 5 ? 5 : 2;
        mockXPendingRange.mockResolvedValueOnce([
          {
            id: `mixed-${i}`,
            deliveriesCounter: deliveryCount,
            name: "consumer-1",
            idle: 90_000,
          },
        ]);
      }

      const processor = new DeadLetterProcessor(
        "agent-stream:mission-stress:agent-receiver:normal",
        "mission-workers",
        "consumer-1"
      );

      const result = await processor.reclaimStale();

      expect(result.deadLettered).toBe(5);
      expect(result.reclaimed).toBe(10);
    });
  });

  describe("metrics hook integration under load", () => {
    it("fires onPublished for every successful publish across 10 agents", async () => {
      let publishedCount = 0;
      setMessagingMetricsHook({
        onPublished: () => {
          publishedCount += 1;
        },
        onRateLimited() {
          /* no-op */
        },
        onDeduplicated() {
          /* no-op */
        },
        onDeadLettered() {
          /* no-op */
        },
        onReclaimed() {
          /* no-op */
        },
        onReprocessed() {
          /* no-op */
        },
      });

      for (let agent = 0; agent < 10; agent++) {
        for (let msg = 0; msg < 20; msg++) {
          const envelope = createEnvelope({
            message: {
              id: `hook-${agent}-${msg}`,
              senderId: `agent-${agent}`,
            },
          });
          await publishAgentMessage(envelope, PERMISSIVE_LIMITER);
        }
      }

      expect(publishedCount).toBe(200);
    });

    it("fires onRateLimited for every rejected message", async () => {
      const rateLimitedAgents: string[] = [];
      setMessagingMetricsHook({
        onPublished() {
          /* no-op */
        },
        onRateLimited: (_missionId, senderId) => {
          rateLimitedAgents.push(senderId);
        },
        onDeduplicated() {
          /* no-op */
        },
        onDeadLettered() {
          /* no-op */
        },
        onReclaimed() {
          /* no-op */
        },
        onReprocessed() {
          /* no-op */
        },
      });

      const limiter = new MessageRateLimiter({
        maxPerSecond: 5,
        maxPerMinute: 200,
        maxPerMission: 5000,
      });

      for (let i = 0; i < 20; i++) {
        try {
          await publishAgentMessage(
            createEnvelope({
              message: { id: `rl-hook-${i}`, senderId: "agent-flood" },
            }),
            limiter
          );
        } catch {
          // expected
        }
      }

      expect(rateLimitedAgents).toHaveLength(15);
      expect(rateLimitedAgents.every((id) => id === "agent-flood")).toBe(true);
    });
  });

  describe("stream cleanup at scale", () => {
    it("cleans up streams for 100 agents across 4 priority levels", async () => {
      const agentIds = Array.from({ length: 100 }, (_, i) => `agent-${i}`);

      const deleted = await cleanupMissionStreams("mission-stress", agentIds);

      const expectedKeys = 100 * 4 * 2 + 100 + 4 * 2 + 1;
      expect(mockDel).toHaveBeenCalledTimes(expectedKeys);
      expect(deleted).toBe(expectedKeys);
    });
  });

  describe("priority stream key uniqueness", () => {
    it("generates unique keys for all priority x agent combinations", () => {
      const keys = new Set<string>();

      for (let agent = 0; agent < 100; agent++) {
        for (const priority of PRIORITY_ORDER) {
          const key = priorityStreamKey(
            "mission-1",
            `agent-${agent}`,
            priority
          );
          expect(keys.has(key)).toBe(false);
          keys.add(key);
        }
      }

      expect(keys.size).toBe(400);
    });

    it("keys encode missionId, agentId, and priority without collision", () => {
      const key1 = priorityStreamKey("m1", "a1", "critical");
      const key2 = priorityStreamKey("m1", "a1", "high");
      const key3 = priorityStreamKey("m1", "a2", "critical");
      const key4 = priorityStreamKey("m2", "a1", "critical");

      const keys = [key1, key2, key3, key4];
      expect(new Set(keys).size).toBe(4);

      expect(key1).toContain("m1");
      expect(key1).toContain("a1");
      expect(key1).toContain("critical");
    });
  });
});
