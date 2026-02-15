import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { DLQEntry } from "@openplane/types/temporal/mission-messaging";

const mockXRange = mock(() =>
  Promise.resolve([] as Array<{ id: string; message: Record<string, string> }>)
);
const mockXAdd = mock(() => Promise.resolve("new-stream-id-0"));
const mockXDel = mock(() => Promise.resolve(1));
const mockXLen = mock(() => Promise.resolve(0));
const mockXAutoClaim = mock(() =>
  Promise.resolve({ messages: [], nextId: "0-0" })
);
const mockXPendingRange = mock(() => Promise.resolve([]));
const mockXAck = mock(() => Promise.resolve(1));
const mockExpire = mock(() => Promise.resolve(true));

const mockRedisClient = {
  xRange: mockXRange,
  xAdd: mockXAdd,
  xDel: mockXDel,
  xLen: mockXLen,
  xAutoClaim: mockXAutoClaim,
  xPendingRange: mockXPendingRange,
  xAck: mockXAck,
  expire: mockExpire,
};

mock.module("../../client", () => ({
  getRedisClient: () => Promise.resolve(mockRedisClient),
}));

const { DeadLetterProcessor } = await import("../dead-letter");

function createDLQEntry(overrides?: Partial<DLQEntry>): DLQEntry {
  return {
    originalStreamKey: "agent-stream:m1:agent-b:normal",
    originalMessageId: "original-1-0",
    envelope: {
      message: {
        id: "msg-1",
        missionId: "m1",
        senderId: "agent-a",
        recipientId: "agent-b",
        kind: "direct",
        priority: "normal",
        subject: "test",
        body: { data: true },
        createdAt: 1_700_000_000_000,
      },
    },
    deliveryAttempts: 4,
    deadLetteredAt: 1_700_000_100_000,
    reason: "Exceeded max delivery attempts (3)",
    ...overrides,
  };
}

describe("DeadLetterProcessor.reprocessDLQMessage", () => {
  beforeEach(() => {
    mockXRange.mockClear();
    mockXAdd.mockClear();
    mockXDel.mockClear();
    mockXRange.mockImplementation(() => Promise.resolve([]));
    mockXAdd.mockImplementation(() => Promise.resolve("new-stream-id-0"));
  });

  it("returns null when DLQ message not found", async () => {
    const processor = new DeadLetterProcessor(
      "agent-stream:m1:agent-b:normal",
      "mission-workers",
      "consumer-1"
    );

    const result = await processor.reprocessDLQMessage("nonexistent-0");
    expect(result).toBeNull();
  });

  it("re-publishes envelope to original stream", async () => {
    const dlqEntry = createDLQEntry();

    mockXRange.mockImplementation(() =>
      Promise.resolve([
        {
          id: "dlq-msg-1",
          message: { data: JSON.stringify(dlqEntry) },
        },
      ])
    );

    const processor = new DeadLetterProcessor(
      "agent-stream:m1:agent-b:normal",
      "mission-workers",
      "consumer-1"
    );

    const newId = await processor.reprocessDLQMessage("dlq-msg-1");

    expect(newId).toBe("new-stream-id-0");
    expect(mockXAdd).toHaveBeenCalledTimes(1);

    const addCall = mockXAdd.mock.calls[0] as unknown[];
    expect(addCall[0]).toBe("agent-stream:m1:agent-b:normal");
    expect(addCall[1]).toBe("*");

    const payload = JSON.parse((addCall[2] as Record<string, string>).data);
    expect(payload.message.id).toBe("msg-1");
    expect(payload.message.senderId).toBe("agent-a");
  });

  it("deletes the DLQ entry after reprocessing", async () => {
    const dlqEntry = createDLQEntry();
    mockXRange.mockImplementation(() =>
      Promise.resolve([
        {
          id: "dlq-msg-1",
          message: { data: JSON.stringify(dlqEntry) },
        },
      ])
    );

    const processor = new DeadLetterProcessor(
      "agent-stream:m1:agent-b:normal",
      "mission-workers",
      "consumer-1"
    );

    await processor.reprocessDLQMessage("dlq-msg-1");

    expect(mockXDel).toHaveBeenCalledTimes(1);
    const delCall = mockXDel.mock.calls[0] as unknown[];
    expect(delCall[0]).toBe("agent-stream:m1:agent-b:normal:dlq");
    expect(delCall[1]).toBe("dlq-msg-1");
  });

  it("returns null for invalid JSON in DLQ entry", async () => {
    mockXRange.mockImplementation(() =>
      Promise.resolve([
        {
          id: "dlq-msg-1",
          message: { data: "not-valid-json" },
        },
      ])
    );

    const processor = new DeadLetterProcessor(
      "agent-stream:m1:agent-b:normal",
      "mission-workers",
      "consumer-1"
    );

    const result = await processor.reprocessDLQMessage("dlq-msg-1");
    expect(result).toBeNull();
    expect(mockXAdd).toHaveBeenCalledTimes(0);
  });

  it("queries DLQ stream with exact message ID range", async () => {
    const processor = new DeadLetterProcessor(
      "agent-stream:m1:agent-b:normal",
      "mission-workers",
      "consumer-1"
    );

    await processor.reprocessDLQMessage("12345-0");

    const rangeCall = mockXRange.mock.calls[0] as unknown[];
    expect(rangeCall[0]).toBe("agent-stream:m1:agent-b:normal:dlq");
    expect(rangeCall[1]).toBe("12345-0");
    expect(rangeCall[2]).toBe("12345-0");
    expect(rangeCall[3]).toEqual({ COUNT: 1 });
  });
});

describe("DeadLetterProcessor.getDLQDepth", () => {
  beforeEach(() => {
    mockXLen.mockClear();
  });

  it("returns stream length from xLen", async () => {
    mockXLen.mockImplementation(() => Promise.resolve(42));

    const processor = new DeadLetterProcessor(
      "agent-stream:m1:agent-b:normal",
      "mission-workers",
      "consumer-1"
    );

    const depth = await processor.getDLQDepth();
    expect(depth).toBe(42);

    const lenCall = mockXLen.mock.calls[0] as unknown[];
    expect(lenCall[0]).toBe("agent-stream:m1:agent-b:normal:dlq");
  });

  it("returns 0 for empty DLQ", async () => {
    mockXLen.mockImplementation(() => Promise.resolve(0));

    const processor = new DeadLetterProcessor(
      "agent-stream:m1:agent-b:normal",
      "mission-workers",
      "consumer-1"
    );

    expect(await processor.getDLQDepth()).toBe(0);
  });
});
