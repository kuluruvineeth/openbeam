import { describe, expect, it, mock } from "bun:test";
import {
  countUnprocessedChanges,
  fetchActivityEventsForUser,
  fetchUnprocessedChanges,
  getUserEntityAffinities,
} from "../knowledge-changes";

type MockCall = Record<string, unknown>;

describe("fetchUnprocessedChanges", () => {
  const createMockDb = () => ({
    documentChange: {
      findMany: mock((_args: MockCall) =>
        Promise.resolve([
          { id: "c1", teamId: "team_1", processedAt: null },
          { id: "c2", teamId: "team_1", processedAt: null },
        ])
      ),
    },
  });

  it("queries for changes where processedAt is null", async () => {
    const mockDb = createMockDb();
    const result = await fetchUnprocessedChanges(
      mockDb as unknown as Parameters<typeof fetchUnprocessedChanges>[0],
      { teamId: "team_1" }
    );

    expect(result).toHaveLength(2);
    expect(mockDb.documentChange.findMany).toHaveBeenCalledTimes(1);

    const call = mockDb.documentChange.findMany.mock.calls[0];
    const args = call?.[0] as Record<string, unknown>;
    expect((args.where as Record<string, unknown>).teamId).toBe("team_1");
    expect((args.where as Record<string, unknown>).processedAt).toBeNull();
  });

  it("orders by createdAt ascending", async () => {
    const mockDb = createMockDb();
    await fetchUnprocessedChanges(
      mockDb as unknown as Parameters<typeof fetchUnprocessedChanges>[0],
      { teamId: "team_1" }
    );

    const call = mockDb.documentChange.findMany.mock.calls[0];
    const args = call?.[0] as Record<string, unknown>;
    expect(args.orderBy).toEqual({ createdAt: "asc" });
  });

  it("defaults limit to 1000", async () => {
    const mockDb = createMockDb();
    await fetchUnprocessedChanges(
      mockDb as unknown as Parameters<typeof fetchUnprocessedChanges>[0],
      { teamId: "team_1" }
    );

    const call = mockDb.documentChange.findMany.mock.calls[0];
    const args = call?.[0] as Record<string, unknown>;
    expect(args.take).toBe(1000);
  });

  it("respects custom limit", async () => {
    const mockDb = createMockDb();
    await fetchUnprocessedChanges(
      mockDb as unknown as Parameters<typeof fetchUnprocessedChanges>[0],
      { teamId: "team_1" },
      { limit: 50 }
    );

    const call = mockDb.documentChange.findMany.mock.calls[0];
    const args = call?.[0] as Record<string, unknown>;
    expect(args.take).toBe(50);
  });

  it("applies connectorId and syncHistoryId filters when provided", async () => {
    const mockDb = createMockDb();
    await fetchUnprocessedChanges(
      mockDb as unknown as Parameters<typeof fetchUnprocessedChanges>[0],
      {
        teamId: "team_1",
        connectorId: "conn_1",
        syncHistoryId: "sync_1",
      }
    );

    const call = mockDb.documentChange.findMany.mock.calls[0];
    const args = call?.[0] as Record<string, unknown>;
    const where = args.where as Record<string, unknown>;
    expect(where.connectorId).toBe("conn_1");
    expect(where.metadata).toEqual({
      path: ["syncHistoryId"],
      equals: "sync_1",
    });
  });
});

describe("countUnprocessedChanges", () => {
  const createMockDb = () => ({
    documentChange: {
      count: mock((_args: MockCall) => Promise.resolve(42)),
    },
  });

  it("counts changes where processedAt is null", async () => {
    const mockDb = createMockDb();
    const result = await countUnprocessedChanges(
      mockDb as unknown as Parameters<typeof countUnprocessedChanges>[0],
      { teamId: "team_1" }
    );

    expect(result).toBe(42);
    expect(mockDb.documentChange.count).toHaveBeenCalledTimes(1);

    const call = mockDb.documentChange.count.mock.calls[0];
    const args = call?.[0] as Record<string, unknown>;
    const where = args.where as Record<string, unknown>;
    expect(where.teamId).toBe("team_1");
    expect(where.processedAt).toBeNull();
  });

  it("applies connectorId and syncHistoryId filters when provided", async () => {
    const mockDb = createMockDb();
    await countUnprocessedChanges(
      mockDb as unknown as Parameters<typeof countUnprocessedChanges>[0],
      {
        teamId: "team_1",
        connectorId: "conn_1",
        syncHistoryId: "sync_1",
      }
    );

    const call = mockDb.documentChange.count.mock.calls[0];
    const args = call?.[0] as Record<string, unknown>;
    const where = args.where as Record<string, unknown>;
    expect(where.connectorId).toBe("conn_1");
    expect(where.metadata).toEqual({
      path: ["syncHistoryId"],
      equals: "sync_1",
    });
  });
});

describe("fetchActivityEventsForUser", () => {
  const createMockDb = () => ({
    activityEvent: {
      findMany: mock((_args: MockCall) =>
        Promise.resolve([
          { id: "ae_1", action: "tool:search", createdAt: new Date() },
        ])
      ),
    },
  });

  it("queries by teamId and userId", async () => {
    const mockDb = createMockDb();
    const result = await fetchActivityEventsForUser(
      mockDb as unknown as Parameters<typeof fetchActivityEventsForUser>[0],
      "team_1",
      "user_1"
    );

    expect(result).toHaveLength(1);

    const call = mockDb.activityEvent.findMany.mock.calls[0];
    const args = call?.[0] as Record<string, unknown>;
    const where = args.where as Record<string, unknown>;
    expect(where.teamId).toBe("team_1");
    expect(where.userId).toBe("user_1");
  });

  it("orders by createdAt descending", async () => {
    const mockDb = createMockDb();
    await fetchActivityEventsForUser(
      mockDb as unknown as Parameters<typeof fetchActivityEventsForUser>[0],
      "team_1",
      "user_1"
    );

    const call = mockDb.activityEvent.findMany.mock.calls[0];
    const args = call?.[0] as Record<string, unknown>;
    expect(args.orderBy).toEqual({ createdAt: "desc" });
  });

  it("defaults limit to 100 and offset to 0", async () => {
    const mockDb = createMockDb();
    await fetchActivityEventsForUser(
      mockDb as unknown as Parameters<typeof fetchActivityEventsForUser>[0],
      "team_1",
      "user_1"
    );

    const call = mockDb.activityEvent.findMany.mock.calls[0];
    const args = call?.[0] as Record<string, unknown>;
    expect(args.take).toBe(100);
    expect(args.skip).toBe(0);
  });

  it("passes date range filters", async () => {
    const mockDb = createMockDb();
    const startDate = new Date("2026-01-01");
    const endDate = new Date("2026-01-31");

    await fetchActivityEventsForUser(
      mockDb as unknown as Parameters<typeof fetchActivityEventsForUser>[0],
      "team_1",
      "user_1",
      { startDate, endDate }
    );

    const call = mockDb.activityEvent.findMany.mock.calls[0];
    const args = call?.[0] as Record<string, unknown>;
    const where = args.where as Record<string, unknown>;
    expect((where.createdAt as Record<string, unknown>)?.gte).toEqual(
      startDate
    );
    expect((where.createdAt as Record<string, unknown>)?.lte).toEqual(endDate);
  });

  it("passes action filter", async () => {
    const mockDb = createMockDb();
    await fetchActivityEventsForUser(
      mockDb as unknown as Parameters<typeof fetchActivityEventsForUser>[0],
      "team_1",
      "user_1",
      { action: "tool:search_hybrid" }
    );

    const call = mockDb.activityEvent.findMany.mock.calls[0];
    const args = call?.[0] as Record<string, unknown>;
    const where = args.where as Record<string, unknown>;
    expect(where.action).toBe("tool:search_hybrid");
  });

  it("respects custom limit and offset", async () => {
    const mockDb = createMockDb();
    await fetchActivityEventsForUser(
      mockDb as unknown as Parameters<typeof fetchActivityEventsForUser>[0],
      "team_1",
      "user_1",
      { limit: 25, offset: 50 }
    );

    const call = mockDb.activityEvent.findMany.mock.calls[0];
    const args = call?.[0] as Record<string, unknown>;
    expect(args.take).toBe(25);
    expect(args.skip).toBe(50);
  });
});

describe("getUserEntityAffinities", () => {
  const createMockDb = () => ({
    userEntityAffinity: {
      findMany: mock((_args: MockCall) =>
        Promise.resolve([
          { entityId: "e1", score: 8.5 },
          { entityId: "e2", score: 5.2 },
        ])
      ),
    },
  });

  it("queries by teamId and userId with score threshold", async () => {
    const mockDb = createMockDb();
    const result = await getUserEntityAffinities(
      mockDb as unknown as Parameters<typeof getUserEntityAffinities>[0],
      "team_1",
      "user_1"
    );

    expect(result).toHaveLength(2);

    const call = mockDb.userEntityAffinity.findMany.mock.calls[0];
    const args = call?.[0] as Record<string, unknown>;
    const where = args.where as Record<string, unknown>;
    expect(where.teamId).toBe("team_1");
    expect(where.userId).toBe("user_1");
    expect((where.score as Record<string, unknown>).gt).toBe(0);
  });

  it("orders by score descending", async () => {
    const mockDb = createMockDb();
    await getUserEntityAffinities(
      mockDb as unknown as Parameters<typeof getUserEntityAffinities>[0],
      "team_1",
      "user_1"
    );

    const call = mockDb.userEntityAffinity.findMany.mock.calls[0];
    const args = call?.[0] as Record<string, unknown>;
    expect(args.orderBy).toEqual({ score: "desc" });
  });

  it("defaults limit to 50", async () => {
    const mockDb = createMockDb();
    await getUserEntityAffinities(
      mockDb as unknown as Parameters<typeof getUserEntityAffinities>[0],
      "team_1",
      "user_1"
    );

    const call = mockDb.userEntityAffinity.findMany.mock.calls[0];
    const args = call?.[0] as Record<string, unknown>;
    expect(args.take).toBe(50);
  });

  it("respects custom minScore and limit", async () => {
    const mockDb = createMockDb();
    await getUserEntityAffinities(
      mockDb as unknown as Parameters<typeof getUserEntityAffinities>[0],
      "team_1",
      "user_1",
      { minScore: 3.0, limit: 10 }
    );

    const call = mockDb.userEntityAffinity.findMany.mock.calls[0];
    const args = call?.[0] as Record<string, unknown>;
    const where = args.where as Record<string, unknown>;
    expect((where.score as Record<string, unknown>).gt).toBe(3.0);
    expect(args.take).toBe(10);
  });
});
