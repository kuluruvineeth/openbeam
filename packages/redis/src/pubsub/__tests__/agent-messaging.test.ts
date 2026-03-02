import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { AgentMessageEnvelope } from "@openplane/types/temporal/mission-messaging";

let xAddCounter = 0;
const mockXAdd = mock(
  (
    _key: string,
    _id: string,
    _message: Record<string, string>,
    _options?: unknown
  ) => {
    xAddCounter += 1;
    return Promise.resolve(`${Date.now()}-${xAddCounter}`);
  }
);
const mockExpire = mock(() => Promise.resolve(true));
const mockXGroupCreate = mock(() => Promise.resolve("OK"));
const mockXReadGroup = mock(() => Promise.resolve(null));
const mockXAck = mock(() => Promise.resolve(1));
const mockXRange = mock(
  (
    _key: string
  ): Promise<Array<{ id: string; message: Record<string, string> }>> =>
    Promise.resolve([])
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
  createAgentStreamConsumer,
  getAgentMessageHistory,
  publishAgentMessage,
} = await import("../agent-messaging");

function createEnvelope(
  overrides?: Omit<Partial<AgentMessageEnvelope>, "message"> & {
    message?: Partial<AgentMessageEnvelope["message"]>;
  }
): AgentMessageEnvelope {
  const messageOverrides = overrides?.message ?? {};
  const baseMessage: AgentMessageEnvelope["message"] = {
    id: "msg-1",
    missionId: "mission-1",
    senderId: "agent-a",
    recipientId: "agent-b",
    kind: "direct",
    priority: "normal",
    subject: "subject",
    body: { ok: true },
    createdAt: 1_700_000_000_000,
  };
  const { message: _message, ...envelopeOverrides } = overrides ?? {};

  return {
    message: { ...baseMessage, ...messageOverrides },
    ...envelopeOverrides,
  };
}

describe("publishAgentMessage", () => {
  beforeEach(() => {
    mockXAdd.mockClear();
    mockExpire.mockClear();
    xAddCounter = 0;
  });

  it("publishes direct messages to priority-specific stream", async () => {
    const envelope = createEnvelope();

    const messageId = await publishAgentMessage(envelope);

    expect(typeof messageId).toBe("string");
    expect(mockXAdd).toHaveBeenCalledTimes(1);
    const call = mockXAdd.mock.calls[0] as unknown[];
    expect(call[0]).toBe("agent-stream:mission-1:agent-b:normal");
  });

  it("publishes broadcast messages to priority broadcast stream", async () => {
    const envelope = createEnvelope({
      message: {
        recipientId: "*",
        kind: "broadcast",
      },
    });

    await publishAgentMessage(envelope);

    expect(mockXAdd).toHaveBeenCalledTimes(1);
    const call = mockXAdd.mock.calls[0] as unknown[];
    expect(call[0]).toBe("agent-stream:mission-1:*:normal");
  });
});

describe("getAgentMessageHistory", () => {
  beforeEach(() => {
    mockXRange.mockClear();
  });

  it("returns history from all priority and legacy streams sorted newest first", async () => {
    const direct = createEnvelope({
      message: { id: "msg-direct", createdAt: 100 },
    });
    const broadcast = createEnvelope({
      message: {
        id: "msg-broadcast",
        recipientId: "*",
        kind: "broadcast",
        createdAt: 200,
      },
    });

    mockXRange.mockImplementation((key: string) => {
      if (key === "agent-stream:mission-1:agent-b:normal") {
        return Promise.resolve([
          { id: "1-0", message: { data: JSON.stringify(direct) } },
        ]);
      }
      if (key === "agent-stream:mission-1:*:normal") {
        return Promise.resolve([
          { id: "2-0", message: { data: JSON.stringify(broadcast) } },
        ]);
      }
      return Promise.resolve([]);
    });

    const history = await getAgentMessageHistory("mission-1", "agent-b", 10);

    expect(mockXRange).toHaveBeenCalledTimes(10);
    expect(history.map((entry) => entry.message.id)).toEqual([
      "msg-broadcast",
      "msg-direct",
    ]);
  });

  it("ignores invalid history entries", async () => {
    const valid = createEnvelope();

    mockXRange.mockImplementation((key: string) => {
      if (key === "agent-stream:mission-1:agent-b:normal") {
        return Promise.resolve([
          { id: "1-0", message: { data: "not-json" } },
          { id: "2-0", message: { data: JSON.stringify(valid) } },
        ]);
      }
      return Promise.resolve([]);
    });

    const history = await getAgentMessageHistory("mission-1", "agent-b", 10);

    expect(history).toHaveLength(1);
    expect(history[0]?.message.id).toBe("msg-1");
  });
});

describe("createAgentStreamConsumer", () => {
  beforeEach(() => {
    mockXGroupCreate.mockClear();
    mockXReadGroup.mockClear();
    mockXAck.mockClear();
    mockXGroupCreate.mockImplementation(() => Promise.resolve("OK"));
  });

  it("creates consumer groups on all priority and legacy streams", async () => {
    mockXReadGroup.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(null), 50))
    );

    const onMessage = mock((_event: AgentMessageEnvelope) => {
      return;
    });
    const consumer = await createAgentStreamConsumer(
      "mission-1",
      "agent-b",
      onMessage
    );

    expect(mockXGroupCreate).toHaveBeenCalledTimes(10);

    consumer.stop();
  });

  it("returns a consumer with stop capability", async () => {
    mockXReadGroup.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(null), 50))
    );

    const onMessage = mock((_event: AgentMessageEnvelope) => {
      return;
    });
    const consumer = await createAgentStreamConsumer(
      "mission-1",
      "agent-b",
      onMessage
    );

    expect(consumer.isRunning).toBe(true);
    consumer.stop();
    expect(consumer.isRunning).toBe(false);
  });
});
