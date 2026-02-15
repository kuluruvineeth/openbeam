import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { AgentMessageEnvelope } from "@openplane/types/temporal/mission-messaging";

const mockXAutoClaim = mock(() =>
  Promise.resolve({ nextId: "0-0", messages: [], deletedMessages: [] })
);
const mockXPendingRange = mock(() =>
  Promise.resolve(
    [] as {
      id: string;
      consumer: string;
      millisecondsSinceLastDelivery: number;
      deliveriesCounter: number;
    }[]
  )
);
const mockXAdd = mock(() => Promise.resolve("1-0"));
const mockExpire = mock(() => Promise.resolve(true));
const mockXAck = mock(() => Promise.resolve(1));
const mockXRange = mock(() =>
  Promise.resolve([] as { id: string; message: Record<string, string> }[])
);
const mockXDel = mock(() => Promise.resolve(1));

const mockRedisClient = {
  xAutoClaim: mockXAutoClaim,
  xPendingRange: mockXPendingRange,
  xAdd: mockXAdd,
  expire: mockExpire,
  xAck: mockXAck,
  xRange: mockXRange,
  xDel: mockXDel,
};

mock.module("../../client", () => ({
  getRedisClient: () => Promise.resolve(mockRedisClient),
}));

const { DeadLetterProcessor, MAX_DELIVERY_ATTEMPTS, CLAIM_IDLE_MS } =
  await import("../dead-letter");

function createEnvelope(id = "msg-1"): AgentMessageEnvelope {
  return {
    message: {
      id,
      missionId: "mission-1",
      senderId: "agent-a",
      recipientId: "agent-b",
      kind: "direct",
      priority: "normal",
      subject: "test",
      body: {},
      createdAt: 1_700_000_000_000,
    },
  };
}

describe("DeadLetterProcessor", () => {
  const STREAM_KEY = "agent-stream:mission-1:agent-b:normal";
  let processor: InstanceType<typeof DeadLetterProcessor>;

  beforeEach(() => {
    mockXAutoClaim.mockClear();
    mockXPendingRange.mockClear();
    mockXAdd.mockClear();
    mockExpire.mockClear();
    mockXAck.mockClear();
    mockXRange.mockClear();
    mockXDel.mockClear();
    processor = new DeadLetterProcessor(
      STREAM_KEY,
      "mission-workers",
      "consumer-1"
    );
  });

  describe("reclaimStale", () => {
    it("returns zeros when no messages to reclaim", async () => {
      mockXAutoClaim.mockResolvedValueOnce({
        nextId: "0-0",
        messages: [],
        deletedMessages: [],
      });

      const result = await processor.reclaimStale();
      expect(result).toEqual({ reclaimed: 0, deadLettered: 0 });
    });

    it("reclaims message with delivery count <= MAX_DELIVERY_ATTEMPTS", async () => {
      const envelope = createEnvelope();
      mockXAutoClaim.mockResolvedValueOnce({
        nextId: "0-0",
        messages: [{ id: "1-0", message: { data: JSON.stringify(envelope) } }],
        deletedMessages: [],
      });
      mockXPendingRange.mockResolvedValueOnce([
        {
          id: "1-0",
          consumer: "consumer-1",
          millisecondsSinceLastDelivery: 70_000,
          deliveriesCounter: 2,
        },
      ]);

      const result = await processor.reclaimStale();
      expect(result.reclaimed).toBe(1);
      expect(result.deadLettered).toBe(0);
      expect(mockXAdd).not.toHaveBeenCalled();
    });

    it("dead-letters message with delivery count > MAX_DELIVERY_ATTEMPTS", async () => {
      const envelope = createEnvelope();
      mockXAutoClaim.mockResolvedValueOnce({
        nextId: "0-0",
        messages: [{ id: "1-0", message: { data: JSON.stringify(envelope) } }],
        deletedMessages: [],
      });
      mockXPendingRange.mockResolvedValueOnce([
        {
          id: "1-0",
          consumer: "consumer-1",
          millisecondsSinceLastDelivery: 70_000,
          deliveriesCounter: 4,
        },
      ]);

      const result = await processor.reclaimStale();
      expect(result.reclaimed).toBe(0);
      expect(result.deadLettered).toBe(1);

      expect(mockXAdd).toHaveBeenCalledTimes(1);
      const addCall = mockXAdd.mock.calls[0] as unknown[];
      expect(addCall[0]).toBe(`${STREAM_KEY}:dlq`);

      expect(mockXAck).toHaveBeenCalledTimes(1);
    });

    it("returns correct counts for mixed reclaim/dead-letter", async () => {
      const env1 = createEnvelope("msg-1");
      const env2 = createEnvelope("msg-2");
      const env3 = createEnvelope("msg-3");

      mockXAutoClaim.mockResolvedValueOnce({
        nextId: "0-0",
        messages: [
          { id: "1-0", message: { data: JSON.stringify(env1) } },
          { id: "2-0", message: { data: JSON.stringify(env2) } },
          { id: "3-0", message: { data: JSON.stringify(env3) } },
        ],
        deletedMessages: [],
      });

      mockXPendingRange
        .mockResolvedValueOnce([
          {
            id: "1-0",
            consumer: "c",
            millisecondsSinceLastDelivery: 70_000,
            deliveriesCounter: 2,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: "2-0",
            consumer: "c",
            millisecondsSinceLastDelivery: 70_000,
            deliveriesCounter: 5,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: "3-0",
            consumer: "c",
            millisecondsSinceLastDelivery: 70_000,
            deliveriesCounter: 1,
          },
        ]);

      const result = await processor.reclaimStale();
      expect(result.reclaimed).toBe(2);
      expect(result.deadLettered).toBe(1);
    });

    it("skips null messages from xAutoClaim", async () => {
      mockXAutoClaim.mockResolvedValueOnce({
        nextId: "0-0",
        messages: [null, null],
        deletedMessages: [],
      });

      const result = await processor.reclaimStale();
      expect(result).toEqual({ reclaimed: 0, deadLettered: 0 });
    });
  });

  describe("getDLQMessages", () => {
    it("returns entries from DLQ stream", async () => {
      const dlqEntry = {
        originalStreamKey: STREAM_KEY,
        originalMessageId: "1-0",
        envelope: createEnvelope(),
        deliveryAttempts: 4,
        deadLetteredAt: Date.now(),
        reason: "Exceeded max delivery attempts (3)",
      };

      mockXRange.mockResolvedValueOnce([
        { id: "dlq-1-0", message: { data: JSON.stringify(dlqEntry) } },
      ]);

      const messages = await processor.getDLQMessages(10);
      expect(messages).toHaveLength(1);
      expect(messages[0]?.originalMessageId).toBe("1-0");
      expect(messages[0]?.deliveryAttempts).toBe(4);
    });

    it("returns empty array when DLQ is empty", async () => {
      mockXRange.mockResolvedValueOnce([]);
      const messages = await processor.getDLQMessages();
      expect(messages).toHaveLength(0);
    });
  });

  describe("ackDLQMessage", () => {
    it("removes message from DLQ stream", async () => {
      await processor.ackDLQMessage("dlq-1-0");
      expect(mockXDel).toHaveBeenCalledTimes(1);
      const delCall = mockXDel.mock.calls[0] as unknown[];
      expect(delCall[0]).toBe(`${STREAM_KEY}:dlq`);
      expect(delCall[1]).toBe("dlq-1-0");
    });
  });

  describe("constants", () => {
    it("MAX_DELIVERY_ATTEMPTS is 3", () => {
      expect(MAX_DELIVERY_ATTEMPTS).toBe(3);
    });

    it("CLAIM_IDLE_MS is 60 seconds", () => {
      expect(CLAIM_IDLE_MS).toBe(60_000);
    });
  });
});
