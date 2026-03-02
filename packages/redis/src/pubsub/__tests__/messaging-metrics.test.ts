import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { AgentMessageEnvelope } from "@openplane/types/temporal/mission-messaging";

const hookCalls: { method: string; args: unknown[] }[] = [];

const testHook = {
  onPublished: (...args: unknown[]) => {
    hookCalls.push({ method: "onPublished", args });
  },
  onRateLimited: (...args: unknown[]) => {
    hookCalls.push({ method: "onRateLimited", args });
  },
  onDeduplicated: (...args: unknown[]) => {
    hookCalls.push({ method: "onDeduplicated", args });
  },
  onDeadLettered: (...args: unknown[]) => {
    hookCalls.push({ method: "onDeadLettered", args });
  },
  onReclaimed: (...args: unknown[]) => {
    hookCalls.push({ method: "onReclaimed", args });
  },
  onReprocessed: (...args: unknown[]) => {
    hookCalls.push({ method: "onReprocessed", args });
  },
};

let incrCount = 0;
const mockIncr = mock(() => {
  incrCount += 1;
  return Promise.resolve(incrCount);
});
const mockExpire = mock(() => Promise.resolve(true));
const mockXAdd = mock(
  (_key: string, _id: string, _msg: Record<string, string>) =>
    Promise.resolve("1-0")
);
const mockSet = mock(() => Promise.resolve("OK"));
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
};

mock.module("../../client", () => ({
  getRedisClient: () => Promise.resolve(mockRedisClient),
}));

const { setMessagingMetricsHook, resetMessagingMetricsHook } = await import(
  "../messaging-metrics"
);
const { publishAgentMessage, MessageRateLimiter, MessageRateLimitError } =
  await import("../agent-messaging");
const { DeadLetterProcessor } = await import("../dead-letter");

function createEnvelope(
  overrides?: Partial<{ message: Partial<AgentMessageEnvelope["message"]> }>
): AgentMessageEnvelope {
  return {
    message: {
      id: "msg-1",
      missionId: "mission-1",
      senderId: "agent-a",
      recipientId: "agent-b",
      kind: "direct",
      priority: "normal",
      subject: "test",
      body: {},
      createdAt: 1_700_000_000_000,
      ...overrides?.message,
    },
  };
}

describe("Messaging metrics hook", () => {
  beforeEach(() => {
    hookCalls.length = 0;
    incrCount = 0;
    mockXAdd.mockClear();
    mockExpire.mockClear();
    mockIncr.mockClear();
    mockSet.mockClear();
    setMessagingMetricsHook(testHook);
  });

  describe("publishAgentMessage", () => {
    it("calls onPublished after successful publish", async () => {
      await publishAgentMessage(createEnvelope());

      const published = hookCalls.filter((c) => c.method === "onPublished");
      expect(published).toHaveLength(1);
      expect(published[0]?.args[0]).toBe("mission-1");
    });

    it("calls onRateLimited when rate limit exceeded", async () => {
      const limiter = new MessageRateLimiter({
        maxPerSecond: 0,
        maxPerMinute: 200,
        maxPerMission: 5000,
      });

      try {
        await publishAgentMessage(createEnvelope(), limiter);
      } catch (error) {
        expect(error).toBeInstanceOf(MessageRateLimitError);
      }

      const rateLimited = hookCalls.filter((c) => c.method === "onRateLimited");
      expect(rateLimited).toHaveLength(1);
      expect(rateLimited[0]?.args[0]).toBe("mission-1");
      expect(rateLimited[0]?.args[1]).toBe("agent-a");
      expect(rateLimited[0]?.args[2]).toBe("second");
    });

    it("does not call onPublished when rate limited", async () => {
      const limiter = new MessageRateLimiter({
        maxPerSecond: 0,
        maxPerMinute: 200,
        maxPerMission: 5000,
      });

      try {
        await publishAgentMessage(createEnvelope(), limiter);
      } catch {
        // expected
      }

      const published = hookCalls.filter((c) => c.method === "onPublished");
      expect(published).toHaveLength(0);
    });
  });

  describe("DeadLetterProcessor", () => {
    it("calls onDeadLettered when messages exceed max delivery attempts", async () => {
      const envelope = createEnvelope();
      mockXAutoClaim.mockResolvedValueOnce({
        messages: [{ id: "1-0", message: { data: JSON.stringify(envelope) } }],
        nextId: "0-0",
      });
      mockXPendingRange.mockResolvedValueOnce([
        { id: "1-0", deliveriesCounter: 5, name: "consumer-1", idle: 90_000 },
      ]);

      const processor = new DeadLetterProcessor(
        "agent-stream:mission-1:agent-b:normal",
        "mission-workers",
        "consumer-1"
      );

      const result = await processor.reclaimStale();

      expect(result.deadLettered).toBe(1);
      const deadLettered = hookCalls.filter(
        (c) => c.method === "onDeadLettered"
      );
      expect(deadLettered).toHaveLength(1);
      expect(deadLettered[0]?.args[0]).toBe(
        "agent-stream:mission-1:agent-b:normal"
      );
    });

    it("calls onReclaimed for reclaimed messages", async () => {
      const envelope = createEnvelope();
      mockXAutoClaim.mockResolvedValueOnce({
        messages: [
          { id: "1-0", message: { data: JSON.stringify(envelope) } },
          { id: "2-0", message: { data: JSON.stringify(envelope) } },
        ],
        nextId: "0-0",
      });
      mockXPendingRange.mockResolvedValue([
        { id: "1-0", deliveriesCounter: 1, name: "consumer-1", idle: 90_000 },
      ]);

      const processor = new DeadLetterProcessor(
        "agent-stream:mission-1:agent-b:normal",
        "mission-workers",
        "consumer-1"
      );

      const result = await processor.reclaimStale();

      expect(result.reclaimed).toBe(2);
      const reclaimed = hookCalls.filter((c) => c.method === "onReclaimed");
      expect(reclaimed).toHaveLength(1);
      expect(reclaimed[0]?.args[1]).toBe(2);
    });

    it("calls onReprocessed when DLQ message is reprocessed", async () => {
      const dlqEntry = {
        originalStreamKey: "agent-stream:mission-1:agent-b:normal",
        originalMessageId: "1-0",
        envelope: createEnvelope(),
        deliveryAttempts: 4,
        deadLetteredAt: Date.now(),
        reason: "test",
      };

      mockXRange.mockResolvedValueOnce([
        { id: "dlq-1", message: { data: JSON.stringify(dlqEntry) } },
      ]);

      const processor = new DeadLetterProcessor(
        "agent-stream:mission-1:agent-b:normal",
        "mission-workers",
        "consumer-1"
      );

      const newId = await processor.reprocessDLQMessage("dlq-1");

      expect(newId).toBe("1-0");
      const reprocessed = hookCalls.filter((c) => c.method === "onReprocessed");
      expect(reprocessed).toHaveLength(1);
      expect(reprocessed[0]?.args[0]).toBe(
        "agent-stream:mission-1:agent-b:normal"
      );
    });
  });

  describe("no-op default", () => {
    it("does not throw when no hook is set", async () => {
      resetMessagingMetricsHook();

      await publishAgentMessage(createEnvelope());

      expect(hookCalls).toHaveLength(0);
    });
  });
});
