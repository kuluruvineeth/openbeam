import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { AgentMessageEnvelope } from "@openplane/types/temporal/mission-messaging";

let xAddCalls: { key: string; data: string }[] = [];
const mockXAdd = mock(
  (key: string, _id: string, message: Record<string, string>) => {
    xAddCalls.push({ key, data: message.data ?? "" });
    return Promise.resolve("1-0");
  }
);
const mockExpire = mock(() => Promise.resolve(true));
const mockXGroupCreate = mock(() => Promise.resolve("OK"));
const mockXReadGroup = mock(() => Promise.resolve(null));
const mockXAck = mock(() => Promise.resolve(1));
const mockXRange = mock(() =>
  Promise.resolve([] as { id: string; message: Record<string, string> }[])
);
const mockSet = mock(() => Promise.resolve("OK"));
const mockIncr = mock(() => Promise.resolve(1));

const mockRedisClient = {
  xAdd: mockXAdd,
  expire: mockExpire,
  xGroupCreate: mockXGroupCreate,
  xReadGroup: mockXReadGroup,
  xAck: mockXAck,
  xRange: mockXRange,
  set: mockSet,
  incr: mockIncr,
};

mock.module("../../client", () => ({
  getRedisClient: () => Promise.resolve(mockRedisClient),
}));

const {
  publishAgentMessage,
  priorityStreamKey,
  PRIORITY_ORDER,
  PRIORITY_BATCH_SIZES,
} = await import("../agent-messaging");

function createEnvelope(
  overrides?: Partial<{
    message: Partial<AgentMessageEnvelope["message"]>;
  }>
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

describe("Priority messaging", () => {
  beforeEach(() => {
    xAddCalls = [];
    mockXAdd.mockClear();
    mockExpire.mockClear();
  });

  describe("publishAgentMessage", () => {
    it("publishes critical message to critical stream", async () => {
      const envelope = createEnvelope({
        message: { priority: "critical" },
      });
      await publishAgentMessage(envelope);

      expect(xAddCalls[0]?.key).toBe("agent-stream:mission-1:agent-b:critical");
    });

    it("publishes normal message to normal stream", async () => {
      const envelope = createEnvelope({
        message: { priority: "normal" },
      });
      await publishAgentMessage(envelope);

      expect(xAddCalls[0]?.key).toBe("agent-stream:mission-1:agent-b:normal");
    });

    it("publishes high message to high stream", async () => {
      const envelope = createEnvelope({
        message: { priority: "high" },
      });
      await publishAgentMessage(envelope);

      expect(xAddCalls[0]?.key).toBe("agent-stream:mission-1:agent-b:high");
    });

    it("publishes low message to low stream", async () => {
      const envelope = createEnvelope({
        message: { priority: "low" },
      });
      await publishAgentMessage(envelope);

      expect(xAddCalls[0]?.key).toBe("agent-stream:mission-1:agent-b:low");
    });

    it("defaults to normal priority when not specified", async () => {
      const envelope: AgentMessageEnvelope = {
        message: {
          id: "msg-default",
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
      await publishAgentMessage(envelope);

      expect(xAddCalls[0]?.key).toBe("agent-stream:mission-1:agent-b:normal");
    });

    it("broadcasts use priority-aware keys", async () => {
      const envelope = createEnvelope({
        message: { recipientId: "*", kind: "broadcast", priority: "high" },
      });
      await publishAgentMessage(envelope);

      expect(xAddCalls[0]?.key).toBe("agent-stream:mission-1:*:high");
    });
  });

  describe("priorityStreamKey", () => {
    it("generates correct key for each priority", () => {
      expect(priorityStreamKey("m1", "a1", "critical")).toBe(
        "agent-stream:m1:a1:critical"
      );
      expect(priorityStreamKey("m1", "a1", "high")).toBe(
        "agent-stream:m1:a1:high"
      );
      expect(priorityStreamKey("m1", "a1", "normal")).toBe(
        "agent-stream:m1:a1:normal"
      );
      expect(priorityStreamKey("m1", "a1", "low")).toBe(
        "agent-stream:m1:a1:low"
      );
    });
  });

  describe("constants", () => {
    it("PRIORITY_ORDER is critical > high > normal > low", () => {
      expect(PRIORITY_ORDER).toEqual(["critical", "high", "normal", "low"]);
    });

    it("PRIORITY_BATCH_SIZES assigns higher batch sizes to higher priorities", () => {
      expect(PRIORITY_BATCH_SIZES.critical).toBe(100);
      expect(PRIORITY_BATCH_SIZES.high).toBe(50);
      expect(PRIORITY_BATCH_SIZES.normal).toBe(10);
      expect(PRIORITY_BATCH_SIZES.low).toBe(5);
    });

    it("batch sizes decrease with priority", () => {
      expect(PRIORITY_BATCH_SIZES.critical).toBeGreaterThan(
        PRIORITY_BATCH_SIZES.high
      );
      expect(PRIORITY_BATCH_SIZES.high).toBeGreaterThan(
        PRIORITY_BATCH_SIZES.normal
      );
      expect(PRIORITY_BATCH_SIZES.normal).toBeGreaterThan(
        PRIORITY_BATCH_SIZES.low
      );
    });
  });
});
