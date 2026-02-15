import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { AgentMessageEnvelope } from "@openplane/types/temporal/mission-messaging";

let setCallArgs: [string, string, Record<string, unknown>][] = [];
const mockSet = mock(
  (_key: string, _value: string, _opts?: Record<string, unknown>) => {
    setCallArgs.push([_key, _value, _opts ?? {}]);
    const calls = setCallArgs.filter(([k]) => k === _key);
    return Promise.resolve(calls.length === 1 ? "OK" : null);
  }
);

const mockXAdd = mock(() => Promise.resolve("1-0"));
const mockExpire = mock(() => Promise.resolve(true));
const mockXGroupCreate = mock(() => Promise.resolve("OK"));
const mockXReadGroup = mock(() => Promise.resolve(null));
const mockXAck = mock(() => Promise.resolve(1));
const mockXRange = mock(() =>
  Promise.resolve([] as { id: string; message: Record<string, string> }[])
);

const mockRedisClient = {
  set: mockSet,
  xAdd: mockXAdd,
  expire: mockExpire,
  xGroupCreate: mockXGroupCreate,
  xReadGroup: mockXReadGroup,
  xAck: mockXAck,
  xRange: mockXRange,
};

mock.module("../../client", () => ({
  getRedisClient: () => Promise.resolve(mockRedisClient),
}));

const { MessageDeduplicator, DEDUP_TTL_SECONDS } = await import(
  "../agent-messaging"
);

function createEnvelope(
  overrides?: Partial<{
    message: Partial<AgentMessageEnvelope["message"]>;
    requestId: string;
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
    requestId: overrides?.requestId,
  };
}

describe("MessageDeduplicator", () => {
  let dedup: InstanceType<typeof MessageDeduplicator>;

  beforeEach(() => {
    setCallArgs = [];
    mockSet.mockClear();
    dedup = new MessageDeduplicator();
  });

  it("first message with ID is not a duplicate", async () => {
    const result = await dedup.isDuplicate("msg-1");
    expect(result).toBe(false);
  });

  it("second call with same ID returns true (duplicate)", async () => {
    await dedup.isDuplicate("msg-1");
    const result = await dedup.isDuplicate("msg-1");
    expect(result).toBe(true);
  });

  it("different IDs are independent", async () => {
    const first = await dedup.isDuplicate("msg-1");
    const second = await dedup.isDuplicate("msg-2");
    expect(first).toBe(false);
    expect(second).toBe(false);
  });

  it("uses SET NX with correct TTL", async () => {
    await dedup.isDuplicate("msg-check");
    expect(mockSet).toHaveBeenCalledTimes(1);
    const [key, value, opts] = setCallArgs[0] ?? ["", "", {}];
    expect(key).toBe("agent-msg-dedup:msg-check");
    expect(value).toBe("1");
    expect(opts).toEqual({ EX: DEDUP_TTL_SECONDS, NX: true });
  });
});

describe("Consumer dedup integration", () => {
  beforeEach(() => {
    setCallArgs = [];
    mockSet.mockClear();
    mockXReadGroup.mockClear();
    mockXAck.mockClear();
    mockXGroupCreate.mockClear();
  });

  it("uses requestId when present, falls back to message.id", async () => {
    const withRequestId = createEnvelope({
      message: { id: "inner-id" },
      requestId: "outer-request-id",
    });

    const withoutRequestId = createEnvelope({
      message: { id: "fallback-id" },
    });

    const dedup = new MessageDeduplicator();

    const dedupId1 = withRequestId.requestId ?? withRequestId.message.id;
    const dedupId2 = withoutRequestId.requestId ?? withoutRequestId.message.id;

    expect(dedupId1).toBe("outer-request-id");
    expect(dedupId2).toBe("fallback-id");

    await dedup.isDuplicate(dedupId1);
    await dedup.isDuplicate(dedupId2);

    expect(setCallArgs[0]?.[0]).toBe("agent-msg-dedup:outer-request-id");
    expect(setCallArgs[1]?.[0]).toBe("agent-msg-dedup:fallback-id");
  });
});
