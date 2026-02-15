import { beforeEach, describe, expect, it, mock } from "bun:test";

const deletedKeys = new Set<string>();

const mockDel = mock((key: string) => {
  deletedKeys.add(key);
  return Promise.resolve(1);
});

const mockRedisClient = {
  del: mockDel,
};

mock.module("../../client", () => ({
  getRedisClient: () => Promise.resolve(mockRedisClient),
}));

mock.module("../../lib/logger", () => ({
  redisLogger: {
    info: mock((..._args: unknown[]) => {
      /* no-op */
    }),
    warn: mock((..._args: unknown[]) => {
      /* no-op */
    }),
    formatError: (e: unknown) => (e instanceof Error ? e.message : String(e)),
  },
}));

const { cleanupMissionStreams, PRIORITY_ORDER } = await import(
  "../agent-messaging"
);

describe("cleanupMissionStreams", () => {
  beforeEach(() => {
    deletedKeys.clear();
    mockDel.mockClear();
  });

  it("deletes all priority stream keys for given agents", async () => {
    await cleanupMissionStreams("m1", ["agent-a", "agent-b"]);

    for (const agentId of ["agent-a", "agent-b"]) {
      for (const priority of PRIORITY_ORDER) {
        expect(deletedKeys.has(`agent-stream:m1:${agentId}:${priority}`)).toBe(
          true
        );
      }
    }
  });

  it("deletes DLQ streams for each priority", async () => {
    await cleanupMissionStreams("m1", ["agent-a"]);

    for (const priority of PRIORITY_ORDER) {
      expect(deletedKeys.has(`agent-stream:m1:agent-a:${priority}:dlq`)).toBe(
        true
      );
    }
  });

  it("deletes broadcast stream keys", async () => {
    await cleanupMissionStreams("m1", ["agent-a"]);

    for (const priority of PRIORITY_ORDER) {
      expect(deletedKeys.has(`agent-stream:m1:*:${priority}`)).toBe(true);
      expect(deletedKeys.has(`agent-stream:m1:*:${priority}:dlq`)).toBe(true);
    }
  });

  it("deletes legacy stream keys", async () => {
    await cleanupMissionStreams("m1", ["agent-a"]);

    expect(deletedKeys.has("agent-stream:m1:agent-a")).toBe(true);
    expect(deletedKeys.has("agent-stream:m1:*")).toBe(true);
  });

  it("returns count of deleted keys", async () => {
    const deleted = await cleanupMissionStreams("m1", ["agent-a"]);
    expect(deleted).toBeGreaterThan(0);
    expect(deleted).toBe(deletedKeys.size);
  });

  it("handles empty agent list", async () => {
    const deleted = await cleanupMissionStreams("m1", []);

    const broadcastCount = PRIORITY_ORDER.length * 2 + 1;
    expect(deleted).toBe(broadcastCount);
  });

  it("handles many agents in batches", async () => {
    const agents = Array.from({ length: 10 }, (_, i) => `agent-${i}`);
    const deleted = await cleanupMissionStreams("m1", agents);

    const perAgent = PRIORITY_ORDER.length * 2 + 1;
    const broadcasts = PRIORITY_ORDER.length * 2 + 1;
    expect(deleted).toBe(agents.length * perAgent + broadcasts);
  });

  it("uses correct key format for priority streams", async () => {
    await cleanupMissionStreams("mission-xyz", ["worker-1"]);

    expect(deletedKeys.has("agent-stream:mission-xyz:worker-1:critical")).toBe(
      true
    );
    expect(deletedKeys.has("agent-stream:mission-xyz:worker-1:high")).toBe(
      true
    );
    expect(deletedKeys.has("agent-stream:mission-xyz:worker-1:normal")).toBe(
      true
    );
    expect(deletedKeys.has("agent-stream:mission-xyz:worker-1:low")).toBe(true);
  });
});
