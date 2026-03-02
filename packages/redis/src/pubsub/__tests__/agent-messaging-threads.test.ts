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
const mockXRange = mock(
  (
    _key: string
  ): Promise<Array<{ id: string; message: Record<string, string> }>> =>
    Promise.resolve([])
);
const mockIncr = mock(() => Promise.resolve(1));

const mockRedisClient = {
  xAdd: mockXAdd,
  expire: mockExpire,
  xGroupCreate: mock(() => Promise.resolve("OK")),
  xReadGroup: mock(() => Promise.resolve(null)),
  xAck: mock(() => Promise.resolve(1)),
  xRange: mockXRange,
  set: mock(() => Promise.resolve("OK")),
  incr: mockIncr,
};

mock.module("../../client", () => ({
  getRedisClient: () => Promise.resolve(mockRedisClient),
}));

const { publishAgentMessage, getMessageThread } = await import(
  "../agent-messaging"
);

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

describe("threadRootId auto-population", () => {
  beforeEach(() => {
    mockXAdd.mockClear();
    mockExpire.mockClear();
    xAddCounter = 0;
  });

  it("sets threadRootId from replyToMessageId when not explicitly set", async () => {
    const envelope = createEnvelope({
      message: {
        id: "reply-1",
        replyToMessageId: "original-msg",
      },
    });

    await publishAgentMessage(envelope);

    expect(mockXAdd).toHaveBeenCalledTimes(1);
    const call = mockXAdd.mock.calls[0] as unknown[];
    const data = JSON.parse(
      (call[2] as { data: string }).data
    ) as AgentMessageEnvelope;
    expect(data.message.threadRootId).toBe("original-msg");
  });

  it("preserves explicit threadRootId when already set", async () => {
    const envelope = createEnvelope({
      message: {
        id: "reply-2",
        replyToMessageId: "mid-thread-msg",
        threadRootId: "root-msg",
      },
    });

    await publishAgentMessage(envelope);

    expect(mockXAdd).toHaveBeenCalledTimes(1);
    const call = mockXAdd.mock.calls[0] as unknown[];
    const data = JSON.parse(
      (call[2] as { data: string }).data
    ) as AgentMessageEnvelope;
    expect(data.message.threadRootId).toBe("root-msg");
  });

  it("does not set threadRootId on non-reply messages", async () => {
    const envelope = createEnvelope({
      message: { id: "standalone" },
    });

    await publishAgentMessage(envelope);

    const call = mockXAdd.mock.calls[0] as unknown[];
    const data = JSON.parse(
      (call[2] as { data: string }).data
    ) as AgentMessageEnvelope;
    expect(data.message.threadRootId).toBeUndefined();
  });
});

describe("getMessageThread", () => {
  beforeEach(() => {
    mockXRange.mockClear();
  });

  it("returns only messages belonging to a thread", async () => {
    const rootMsg = createEnvelope({
      message: { id: "root-1", createdAt: 100 },
    });
    const reply1 = createEnvelope({
      message: {
        id: "reply-1",
        threadRootId: "root-1",
        replyToMessageId: "root-1",
        createdAt: 200,
      },
    });
    const reply2 = createEnvelope({
      message: {
        id: "reply-2",
        threadRootId: "root-1",
        replyToMessageId: "reply-1",
        createdAt: 300,
      },
    });
    const unrelated = createEnvelope({
      message: { id: "unrelated", createdAt: 150 },
    });

    mockXRange.mockImplementation((key: string) => {
      if (key === "agent-stream:mission-1:agent-b:normal") {
        return Promise.resolve([
          { id: "1-0", message: { data: JSON.stringify(rootMsg) } },
          { id: "2-0", message: { data: JSON.stringify(reply1) } },
          { id: "3-0", message: { data: JSON.stringify(reply2) } },
          { id: "4-0", message: { data: JSON.stringify(unrelated) } },
        ]);
      }
      return Promise.resolve([]);
    });

    const thread = await getMessageThread("mission-1", "agent-b", "root-1");

    expect(thread).toHaveLength(3);
    const threadIds = thread.map((e) => e.message.id);
    expect(threadIds).toContain("root-1");
    expect(threadIds).toContain("reply-1");
    expect(threadIds).toContain("reply-2");
    expect(threadIds).not.toContain("unrelated");
  });

  it("returns empty array when no messages match thread", async () => {
    mockXRange.mockImplementation(() => Promise.resolve([]));

    const thread = await getMessageThread(
      "mission-1",
      "agent-b",
      "nonexistent-root"
    );

    expect(thread).toHaveLength(0);
  });
});
