import { beforeEach, describe, expect, it, mock } from "bun:test";

const counters = new Map<string, number>();

const mockIncr = mock((key: string) => {
  const current = (counters.get(key) ?? 0) + 1;
  counters.set(key, current);
  return Promise.resolve(current);
});
const mockExpire = mock(() => Promise.resolve(true));
const mockXAdd = mock(() => Promise.resolve(`${Date.now()}-0`));
const mockSet = mock(() => Promise.resolve("OK"));

const mockRedisClient = {
  incr: mockIncr,
  expire: mockExpire,
  xAdd: mockXAdd,
  set: mockSet,
};

mock.module("../../client", () => ({
  getRedisClient: () => Promise.resolve(mockRedisClient),
}));

const {
  MessageRateLimiter,
  MessageRateLimitError,
  AGENT_MSG_RATE_LIMIT,
  publishAgentMessage,
} = await import("../agent-messaging");

type AgentMessageEnvelope = Parameters<typeof publishAgentMessage>[0];

function createEnvelope(
  overrides?: Partial<{ senderId: string; missionId: string }>
): AgentMessageEnvelope {
  return {
    message: {
      id: `msg-${Date.now()}`,
      missionId: overrides?.missionId ?? "mission-1",
      senderId: overrides?.senderId ?? "agent-a",
      recipientId: "agent-b",
      kind: "direct",
      priority: "normal",
      subject: "test",
      body: {},
      createdAt: Date.now(),
    },
  };
}

describe("MessageRateLimiter", () => {
  beforeEach(() => {
    counters.clear();
    mockIncr.mockClear();
    mockExpire.mockClear();
  });

  it("allows messages under all limits", async () => {
    const limiter = new MessageRateLimiter();
    const result = await limiter.checkAndIncrement("mission-1", "agent-a");

    expect(result.allowed).toBe(true);
    expect(result.deniedBy).toBeUndefined();
    expect(result.counts.second).toBe(1);
    expect(result.counts.minute).toBe(1);
    expect(result.counts.mission).toBe(1);
  });

  it("denies when per-second limit exceeded", async () => {
    const limiter = new MessageRateLimiter({
      maxPerSecond: 2,
      maxPerMinute: 100,
      maxPerMission: 1000,
    });

    await limiter.checkAndIncrement("m1", "a1");
    await limiter.checkAndIncrement("m1", "a1");
    const result = await limiter.checkAndIncrement("m1", "a1");

    expect(result.allowed).toBe(false);
    expect(result.deniedBy).toBe("second");
    expect(result.counts.second).toBe(3);
  });

  it("denies when per-minute limit exceeded", async () => {
    const limiter = new MessageRateLimiter({
      maxPerSecond: 100,
      maxPerMinute: 2,
      maxPerMission: 1000,
    });

    await limiter.checkAndIncrement("m1", "a1");
    await limiter.checkAndIncrement("m1", "a1");
    const result = await limiter.checkAndIncrement("m1", "a1");

    expect(result.allowed).toBe(false);
    expect(result.deniedBy).toBe("minute");
  });

  it("denies when per-mission limit exceeded", async () => {
    const limiter = new MessageRateLimiter({
      maxPerSecond: 100,
      maxPerMinute: 100,
      maxPerMission: 2,
    });

    await limiter.checkAndIncrement("m1", "a1");
    await limiter.checkAndIncrement("m1", "a1");
    const result = await limiter.checkAndIncrement("m1", "a1");

    expect(result.allowed).toBe(false);
    expect(result.deniedBy).toBe("mission");
  });

  it("sets TTL on first increment for each window", async () => {
    const limiter = new MessageRateLimiter();
    await limiter.checkAndIncrement("m1", "a1");

    expect(mockExpire).toHaveBeenCalledTimes(3);
    const calls = mockExpire.mock.calls as unknown[][];
    expect(calls[0]?.[1]).toBe(1);
    expect(calls[1]?.[1]).toBe(60);
    expect(calls[2]?.[1]).toBe(14_400);
  });

  it("does not set TTL on subsequent increments", async () => {
    const limiter = new MessageRateLimiter();
    await limiter.checkAndIncrement("m1", "a1");
    mockExpire.mockClear();

    await limiter.checkAndIncrement("m1", "a1");
    expect(mockExpire).toHaveBeenCalledTimes(0);
  });

  it("isolates rate limits per sender", async () => {
    const limiter = new MessageRateLimiter({
      maxPerSecond: 1,
      maxPerMinute: 100,
      maxPerMission: 1000,
    });

    const r1 = await limiter.checkAndIncrement("m1", "agent-a");
    const r2 = await limiter.checkAndIncrement("m1", "agent-b");

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });

  it("isolates rate limits per mission", async () => {
    const limiter = new MessageRateLimiter({
      maxPerSecond: 1,
      maxPerMinute: 100,
      maxPerMission: 1000,
    });

    const r1 = await limiter.checkAndIncrement("m1", "agent-a");
    const r2 = await limiter.checkAndIncrement("m2", "agent-a");

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });

  it("uses correct Redis key structure", async () => {
    const limiter = new MessageRateLimiter();
    await limiter.checkAndIncrement("mission-42", "agent-x");

    const calls = mockIncr.mock.calls as unknown[][];
    expect(calls[0]?.[0]).toBe("agent-rate:mission-42:agent-x:s");
    expect(calls[1]?.[0]).toBe("agent-rate:mission-42:agent-x:m");
    expect(calls[2]?.[0]).toBe("agent-rate:mission-42:agent-x:total");
  });

  it("checks per-second before per-minute before per-mission", async () => {
    const limiter = new MessageRateLimiter({
      maxPerSecond: 1,
      maxPerMinute: 1,
      maxPerMission: 1,
    });

    await limiter.checkAndIncrement("m1", "a1");
    const result = await limiter.checkAndIncrement("m1", "a1");

    expect(result.allowed).toBe(false);
    expect(result.deniedBy).toBe("second");
  });

  it("accepts custom limits via constructor", async () => {
    const limiter = new MessageRateLimiter({
      maxPerSecond: 5,
      maxPerMinute: 50,
      maxPerMission: 500,
    });

    for (let i = 0; i < 5; i++) {
      const r = await limiter.checkAndIncrement("m1", "a1");
      expect(r.allowed).toBe(true);
    }

    const denied = await limiter.checkAndIncrement("m1", "a1");
    expect(denied.allowed).toBe(false);
    expect(denied.deniedBy).toBe("second");
  });
});

describe("AGENT_MSG_RATE_LIMIT constants", () => {
  it("has correct default values", () => {
    expect(AGENT_MSG_RATE_LIMIT.maxPerSecond).toBe(10);
    expect(AGENT_MSG_RATE_LIMIT.maxPerMinute).toBe(200);
    expect(AGENT_MSG_RATE_LIMIT.maxPerMission).toBe(5000);
  });
});

describe("MessageRateLimitError", () => {
  it("contains missionId, senderId, deniedBy, and counts", () => {
    const counts = { second: 11, minute: 50, mission: 100 };
    const error = new MessageRateLimitError("m1", "a1", "second", counts);

    expect(error.missionId).toBe("m1");
    expect(error.senderId).toBe("a1");
    expect(error.deniedBy).toBe("second");
    expect(error.counts).toEqual(counts);
    expect(error.name).toBe("MessageRateLimitError");
    expect(error.message).toContain("second limit hit");
  });

  it("extends Error", () => {
    const error = new MessageRateLimitError("m1", "a1", "minute", {
      second: 1,
      minute: 201,
      mission: 500,
    });
    expect(error instanceof Error).toBe(true);
  });
});

describe("publishAgentMessage with rate limiting", () => {
  beforeEach(() => {
    counters.clear();
    mockIncr.mockClear();
    mockExpire.mockClear();
    mockXAdd.mockClear();
  });

  it("publishes when under rate limit", async () => {
    const envelope = createEnvelope();
    const limiter = new MessageRateLimiter();
    const id = await publishAgentMessage(envelope, limiter);

    expect(typeof id).toBe("string");
    expect(mockXAdd).toHaveBeenCalledTimes(1);
  });

  it("throws MessageRateLimitError when rate limited", async () => {
    const limiter = new MessageRateLimiter({
      maxPerSecond: 1,
      maxPerMinute: 100,
      maxPerMission: 1000,
    });

    await publishAgentMessage(createEnvelope(), limiter);

    try {
      await publishAgentMessage(createEnvelope(), limiter);
      expect(false).toBe(true);
    } catch (error) {
      expect(error instanceof MessageRateLimitError).toBe(true);
      const rle = error as InstanceType<typeof MessageRateLimitError>;
      expect(rle.deniedBy).toBe("second");
      expect(rle.senderId).toBe("agent-a");
    }
  });

  it("does not call xAdd when rate limited", async () => {
    const limiter = new MessageRateLimiter({
      maxPerSecond: 1,
      maxPerMinute: 100,
      maxPerMission: 1000,
    });

    await publishAgentMessage(createEnvelope(), limiter);
    mockXAdd.mockClear();

    try {
      await publishAgentMessage(createEnvelope(), limiter);
    } catch {
      // expected
    }

    expect(mockXAdd).toHaveBeenCalledTimes(0);
  });

  it("rate limits per sender independently", async () => {
    const limiter = new MessageRateLimiter({
      maxPerSecond: 1,
      maxPerMinute: 100,
      maxPerMission: 1000,
    });

    await publishAgentMessage(createEnvelope({ senderId: "agent-a" }), limiter);
    const id = await publishAgentMessage(
      createEnvelope({ senderId: "agent-b" }),
      limiter
    );

    expect(typeof id).toBe("string");
  });
});
