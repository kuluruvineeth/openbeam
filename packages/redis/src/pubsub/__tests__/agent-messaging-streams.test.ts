import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { AgentMessageEnvelope } from "@openplane/types/temporal/mission-messaging";

let xAddCallCount = 0;
const mockXAdd = mock(
  (
    _key: string,
    _id: string,
    _message: Record<string, string>,
    _options?: unknown
  ) => {
    xAddCallCount += 1;
    return Promise.resolve(`${Date.now()}-${xAddCallCount}`);
  }
);
const mockExpire = mock(() => Promise.resolve(true));
const mockXGroupCreate = mock(() => Promise.resolve("OK"));
const mockXReadGroup = mock(
  (
    _group: string,
    _consumer: string,
    _streams: { key: string }[]
  ): Promise<
    | null
    | {
        name: string;
        messages: { id: string; message: Record<string, string> }[];
      }[]
  > => Promise.resolve(null)
);
const mockXAck = mock(() => Promise.resolve(1));
const mockXRange = mock(
  (_key: string): Promise<{ id: string; message: Record<string, string> }[]> =>
    Promise.resolve([])
);

const mockSet = mock(() => Promise.resolve("OK"));
const mockIncr = mock(() => Promise.resolve(1));
const mockXAutoClaim = mock(() =>
  Promise.resolve({ messages: [], nextId: "0-0" })
);
const mockXPendingRange = mock(() => Promise.resolve([]));
const mockXDel = mock(() => Promise.resolve(1));

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

describe("publishAgentMessage (streams)", () => {
  beforeEach(() => {
    mockXAdd.mockClear();
    mockExpire.mockClear();
    mockIncr.mockClear();
    xAddCallCount = 0;
  });

  it("returns stream message ID", async () => {
    const envelope = createEnvelope();
    const messageId = await publishAgentMessage(envelope);

    expect(typeof messageId).toBe("string");
    expect(messageId.length).toBeGreaterThan(0);
  });

  it("publishes direct messages to priority-specific stream", async () => {
    const envelope = createEnvelope();
    await publishAgentMessage(envelope);

    expect(mockXAdd).toHaveBeenCalledTimes(1);
    const call = mockXAdd.mock.calls[0] as unknown[];
    expect(call[0]).toBe("agent-stream:mission-1:agent-b:normal");
    expect(call[1]).toBe("*");
    expect((call[2] as Record<string, string>).data).toBe(
      JSON.stringify(envelope)
    );
  });

  it("publishes broadcast messages to priority broadcast stream", async () => {
    const envelope = createEnvelope({
      message: { recipientId: "*", kind: "broadcast" },
    });
    await publishAgentMessage(envelope);

    expect(mockXAdd).toHaveBeenCalledTimes(1);
    const call = mockXAdd.mock.calls[0] as unknown[];
    expect(call[0]).toBe("agent-stream:mission-1:*:normal");
  });

  it("applies MAXLEN trimming", async () => {
    const envelope = createEnvelope();
    await publishAgentMessage(envelope);

    const call = mockXAdd.mock.calls[0] as unknown[];
    const options = call[3] as {
      TRIM?: { strategy: string; strategyModifier: string; threshold: number };
    };
    expect(options.TRIM?.strategy).toBe("MAXLEN");
    expect(options.TRIM?.strategyModifier).toBe("~");
    expect(options.TRIM?.threshold).toBe(1000);
  });

  it("sets TTL on priority stream key", async () => {
    const envelope = createEnvelope();
    await publishAgentMessage(envelope);

    const expireCalls = mockExpire.mock.calls as unknown[][];
    const streamTtlCall = expireCalls.find(
      (call) => call[0] === "agent-stream:mission-1:agent-b:normal"
    );
    expect(streamTtlCall).toBeDefined();
    expect(streamTtlCall?.[1]).toBe(14_400);
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

    const onMessage = mock((_e: AgentMessageEnvelope) => {
      return;
    });
    const consumer = await createAgentStreamConsumer(
      "mission-1",
      "agent-b",
      onMessage
    );

    expect(mockXGroupCreate).toHaveBeenCalledTimes(10);
    const calls = mockXGroupCreate.mock.calls as unknown[][];
    expect(calls[0]?.[0]).toBe("agent-stream:mission-1:agent-b:critical");
    expect(calls[0]?.[1]).toBe("mission-workers");
    expect(calls[4]?.[0]).toBe("agent-stream:mission-1:*:critical");
    expect(calls[4]?.[1]).toBe("mission-workers");
    expect(calls[8]?.[0]).toBe("agent-stream:mission-1:agent-b");
    expect(calls[9]?.[0]).toBe("agent-stream:mission-1:*");

    consumer.stop();
  });

  it("handles BUSYGROUP error when group already exists", async () => {
    mockXGroupCreate.mockImplementation(() =>
      Promise.reject(new Error("BUSYGROUP Consumer Group name already exists"))
    );
    mockXReadGroup.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(null), 50))
    );

    const onMessage = mock((_e: AgentMessageEnvelope) => {
      return;
    });
    const consumer = await createAgentStreamConsumer(
      "mission-1",
      "agent-b",
      onMessage
    );

    expect(consumer.isRunning).toBe(true);
    consumer.stop();
  });

  it("receives published messages and acknowledges them", async () => {
    const envelope = createEnvelope();
    let delivered = false;

    mockXReadGroup.mockImplementation(
      (_group: string, _consumer: string, streams: { key: string }[]) => {
        const streamKey = streams[0]?.key ?? "";
        if (
          !delivered &&
          streamKey === "agent-stream:mission-1:agent-b:normal"
        ) {
          delivered = true;
          return Promise.resolve([
            {
              name: "agent-stream:mission-1:agent-b:normal",
              messages: [
                {
                  id: "1700000000000-1",
                  message: { data: JSON.stringify(envelope) },
                },
              ],
            },
          ]);
        }
        return new Promise((resolve) => setTimeout(() => resolve(null), 5));
      }
    );

    const received: AgentMessageEnvelope[] = [];
    const onMessage = (e: AgentMessageEnvelope) => received.push(e);

    const consumer = await createAgentStreamConsumer(
      "mission-1",
      "agent-b",
      onMessage
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(received).toHaveLength(1);
    expect(received[0]?.message.id).toBe("msg-1");
    expect(mockXAck).toHaveBeenCalledWith(
      "agent-stream:mission-1:agent-b:normal",
      "mission-workers",
      "1700000000000-1"
    );

    consumer.stop();
  });

  it("stops cleanly when stop() is called", async () => {
    mockXReadGroup.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(null), 50))
    );

    const onMessage = mock((_e: AgentMessageEnvelope) => {
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

describe("getAgentMessageHistory (streams)", () => {
  beforeEach(() => {
    mockXRange.mockClear();
  });

  it("returns history from all priority streams sorted newest first", async () => {
    const directEnvelope = createEnvelope({
      message: { id: "msg-direct", createdAt: 100 },
    });
    const broadcastEnvelope = createEnvelope({
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
          { id: "1-0", message: { data: JSON.stringify(directEnvelope) } },
        ]);
      }
      if (key === "agent-stream:mission-1:*:normal") {
        return Promise.resolve([
          { id: "2-0", message: { data: JSON.stringify(broadcastEnvelope) } },
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

  it("ignores invalid stream entries", async () => {
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

  it("respects limit parameter", async () => {
    const envelopes = Array.from({ length: 5 }, (_, i) =>
      createEnvelope({ message: { id: `msg-${i}`, createdAt: i } })
    );

    mockXRange.mockImplementation((key: string) => {
      if (key === "agent-stream:mission-1:agent-b:normal") {
        return Promise.resolve(
          envelopes.map((e, i) => ({
            id: `${i}-0`,
            message: { data: JSON.stringify(e) },
          }))
        );
      }
      return Promise.resolve([]);
    });

    const history = await getAgentMessageHistory("mission-1", "agent-b", 3);

    expect(history).toHaveLength(3);
  });

  it("queries all priority and legacy stream keys", async () => {
    mockXRange.mockResolvedValue([]);

    await getAgentMessageHistory("mission-1", "agent-b", 10);

    const calls = mockXRange.mock.calls as unknown[][];
    expect(calls).toHaveLength(10);
    expect(calls[0]?.[0]).toBe("agent-stream:mission-1:agent-b:critical");
    expect(calls[1]?.[0]).toBe("agent-stream:mission-1:agent-b:high");
    expect(calls[2]?.[0]).toBe("agent-stream:mission-1:agent-b:normal");
    expect(calls[3]?.[0]).toBe("agent-stream:mission-1:agent-b:low");
    expect(calls[4]?.[0]).toBe("agent-stream:mission-1:*:critical");
    expect(calls[8]?.[0]).toBe("agent-stream:mission-1:agent-b");
    expect(calls[9]?.[0]).toBe("agent-stream:mission-1:*");
  });
});
