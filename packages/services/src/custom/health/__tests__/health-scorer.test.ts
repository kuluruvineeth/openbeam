import { describe, expect, mock, test } from "bun:test";

type AnyFn = (...args: any[]) => any;
const mockGetByConnectorId = mock((() => Promise.resolve(null)) as AnyFn);
const mockGetRecentSyncRuns = mock((() => Promise.resolve([])) as AnyFn);
const mockCacheGet = mock((() => Promise.resolve(null)) as AnyFn);
const mockCacheSet = mock((() => Promise.resolve()) as AnyFn);
const mockCacheDel = mock((() => Promise.resolve()) as AnyFn);

mock.module("@openbeam/db", () => ({
  getCustomConnectorByConnectorId: mockGetByConnectorId,
  getRecentSyncRuns: mockGetRecentSyncRuns,
}));

mock.module("@openbeam/redis", () => ({
  cache: {
    get: mockCacheGet,
    set: mockCacheSet,
    del: mockCacheDel,
  },
}));

const { computeHealthScore, getHealthScore, invalidateHealthCache } =
  await import("../health-scorer");

type Db = Parameters<typeof computeHealthScore>[0];
const mockDb = {} as Db;

function mockDefinition(overrides: Record<string, unknown> = {}) {
  return {
    id: "def-1",
    connectorId: "conn-1",
    teamId: "team-1",
    slug: "test",
    name: "Test Connector",
    totalDocuments: 100,
    totalPushes: 50,
    lastPushAt: new Date("2026-03-25T12:00:00Z"),
    consecutiveErrors: 0,
    ...overrides,
  };
}

function mockSyncRun(overrides: Record<string, unknown> = {}) {
  return {
    id: "run-1",
    definitionId: "def-1",
    syncType: "push",
    status: "completed",
    documentsProcessed: 10,
    documentsFailed: 0,
    documentsDeleted: 0,
    startedAt: new Date(Date.now() - 60_000),
    completedAt: new Date(),
    durationMs: 60_000,
    errorMessage: null,
    ...overrides,
  };
}

describe("computeHealthScore", () => {
  test("returns zero score for missing definition", async () => {
    mockGetByConnectorId.mockResolvedValueOnce(null);

    const result = await computeHealthScore(mockDb, "missing-conn");

    expect(result.score).toBe(0);
    expect(result.status).toBe("unhealthy");
    expect(result.factors).toHaveLength(0);
  });

  test("returns healthy score with all successful runs", async () => {
    mockGetByConnectorId.mockResolvedValueOnce(mockDefinition());
    mockGetRecentSyncRuns.mockResolvedValueOnce([
      mockSyncRun({ id: "run-1" }),
      mockSyncRun({ id: "run-2" }),
      mockSyncRun({ id: "run-3" }),
    ]);

    const result = await computeHealthScore(mockDb, "conn-1");

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.status).toBe("healthy");
    expect(result.factors).toHaveLength(3);
    expect(result.totalDocuments).toBe(100);
    expect(result.consecutiveErrors).toBe(0);
  });

  test("returns degraded score with mixed runs", async () => {
    mockGetByConnectorId.mockResolvedValueOnce(
      mockDefinition({ consecutiveErrors: 3 })
    );
    mockGetRecentSyncRuns.mockResolvedValueOnce([
      mockSyncRun({ id: "run-1", status: "completed" }),
      mockSyncRun({ id: "run-2", status: "failed", completedAt: null }),
      mockSyncRun({ id: "run-3", status: "completed" }),
      mockSyncRun({ id: "run-4", status: "failed", completedAt: null }),
    ]);

    const result = await computeHealthScore(mockDb, "conn-1");

    expect(result.score).toBeLessThan(80);
    expect(result.consecutiveErrors).toBe(3);
  });

  test("returns unhealthy score with all failures and high errors", async () => {
    mockGetByConnectorId.mockResolvedValueOnce(
      mockDefinition({
        consecutiveErrors: 15,
        lastPushAt: new Date("2026-03-10T12:00:00Z"),
      })
    );
    mockGetRecentSyncRuns.mockResolvedValueOnce([
      mockSyncRun({ id: "run-1", status: "failed", completedAt: null }),
      mockSyncRun({ id: "run-2", status: "failed", completedAt: null }),
    ]);

    const result = await computeHealthScore(mockDb, "conn-1");

    expect(result.score).toBeLessThan(50);
    expect(result.status).toBe("unhealthy");
  });

  test("handles no sync runs gracefully", async () => {
    mockGetByConnectorId.mockResolvedValueOnce(
      mockDefinition({ lastPushAt: null })
    );
    mockGetRecentSyncRuns.mockResolvedValueOnce([]);

    const result = await computeHealthScore(mockDb, "conn-1");

    expect(result.score).toBeGreaterThan(0);
    expect(result.factors).toHaveLength(3);

    const successFactor = result.factors.find((f) => f.name === "Success Rate");
    expect(successFactor?.score).toBe(100);
    expect(successFactor?.detail).toBe("No syncs yet");
  });

  test("weights factors correctly (success 50%, freshness 30%, errors 20%)", async () => {
    mockGetByConnectorId.mockResolvedValueOnce(mockDefinition());
    mockGetRecentSyncRuns.mockResolvedValueOnce([mockSyncRun({ id: "run-1" })]);

    const result = await computeHealthScore(mockDb, "conn-1");

    const weights = result.factors.map((f) => f.weight);
    expect(weights).toEqual([0.5, 0.3, 0.2]);
  });

  test("score is always between 0 and 100", async () => {
    mockGetByConnectorId.mockResolvedValueOnce(
      mockDefinition({ consecutiveErrors: 100 })
    );
    mockGetRecentSyncRuns.mockResolvedValueOnce([]);

    const result = await computeHealthScore(mockDb, "conn-1");

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe("getHealthScore", () => {
  test("returns cached value when available", async () => {
    const cached = {
      score: 95,
      status: "healthy" as const,
      factors: [],
      lastSyncAt: null,
      totalDocuments: 50,
      consecutiveErrors: 0,
    };
    mockCacheGet.mockResolvedValueOnce(cached);

    const result = await getHealthScore(mockDb, "conn-cached");

    expect(result.score).toBe(95);
  });

  test("computes and caches when no cache hit", async () => {
    mockCacheGet.mockResolvedValueOnce(null);
    mockGetByConnectorId.mockResolvedValueOnce(mockDefinition());
    mockGetRecentSyncRuns.mockResolvedValueOnce([mockSyncRun()]);

    const result = await getHealthScore(mockDb, "conn-1");

    expect(result.score).toBeGreaterThan(0);
    expect(mockCacheSet).toHaveBeenCalled();
  });
});

describe("invalidateHealthCache", () => {
  test("deletes cache key", async () => {
    await invalidateHealthCache("conn-1");
    expect(mockCacheDel).toHaveBeenCalled();
  });
});
