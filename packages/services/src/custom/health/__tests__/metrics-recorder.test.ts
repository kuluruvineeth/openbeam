import { describe, expect, mock, test } from "bun:test";

type AnyFn = (...args: any[]) => any;
const mockCreateSyncRun = mock((() =>
  Promise.resolve({ id: "run-default", definitionId: "def-1" })) as AnyFn);
const mockCompleteSyncRun = mock((() => Promise.resolve({})) as AnyFn);
const mockFailSyncRun = mock((() => Promise.resolve({})) as AnyFn);
const mockUpsertHourlyMetrics = mock((() => Promise.resolve({})) as AnyFn);
const mockInvalidateHealthCache = mock((() => Promise.resolve()) as AnyFn);

mock.module("@openbeam/db", () => ({
  createSyncRun: mockCreateSyncRun,
  completeSyncRun: mockCompleteSyncRun,
  failSyncRun: mockFailSyncRun,
  upsertHourlyMetrics: mockUpsertHourlyMetrics,
}));

mock.module("@openbeam/redis", () => ({
  cache: {
    get: mock(() => Promise.resolve(null)),
    set: mock(() => Promise.resolve()),
    del: mock(() => Promise.resolve()),
  },
}));

mock.module("../../lib/logger", () => ({
  createServiceLogger: () => ({
    info: Function.prototype,
    error: Function.prototype,
    warn: Function.prototype,
    debug: Function.prototype,
  }),
}));

mock.module("../health-scorer", () => ({
  invalidateHealthCache: mockInvalidateHealthCache,
}));

const { startSyncRun, recordSyncSuccess, recordSyncFailure } = await import(
  "../metrics-recorder"
);

type Db = Parameters<typeof startSyncRun>[0];
const mockDb = {} as Db;

describe("startSyncRun", () => {
  test("creates a sync run and returns handle", async () => {
    mockCreateSyncRun.mockResolvedValueOnce({
      id: "run-123",
      definitionId: "def-1",
      syncType: "push",
      status: "running",
    });

    const handle = await startSyncRun(mockDb, "def-1", "conn-1", "push");

    expect(handle.id).toBe("run-123");
    expect(handle.definitionId).toBe("def-1");
    expect(handle.connectorId).toBe("conn-1");
    expect(handle.startedAt).toBeGreaterThan(0);
    expect(mockCreateSyncRun).toHaveBeenCalledWith(mockDb, {
      definitionId: "def-1",
      syncType: "push",
    });
  });
});

describe("recordSyncSuccess", () => {
  test("completes run, upserts metrics, and invalidates cache", async () => {
    mockCompleteSyncRun.mockResolvedValueOnce({});
    mockUpsertHourlyMetrics.mockResolvedValueOnce({});
    mockInvalidateHealthCache.mockResolvedValueOnce(undefined);

    const handle = {
      id: "run-123",
      definitionId: "def-1",
      connectorId: "conn-1",
      startedAt: Date.now() - 5000,
    };

    await recordSyncSuccess(mockDb, handle, {
      documentsProcessed: 25,
      documentsFailed: 2,
      documentsDeleted: 3,
    });

    expect(mockCompleteSyncRun).toHaveBeenCalledWith(mockDb, "run-123", {
      documentsProcessed: 25,
      documentsFailed: 2,
      documentsDeleted: 3,
    });

    expect(mockUpsertHourlyMetrics).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        definitionId: "def-1",
        success: true,
        documentsProcessed: 25,
        errorCount: 2,
      })
    );

    expect(mockInvalidateHealthCache).toHaveBeenCalledWith("conn-1");
  });

  test("upserts metrics with correct hour boundary", async () => {
    mockCompleteSyncRun.mockResolvedValueOnce({});
    mockUpsertHourlyMetrics.mockResolvedValueOnce({});
    mockInvalidateHealthCache.mockResolvedValueOnce(undefined);

    const handle = {
      id: "run-456",
      definitionId: "def-1",
      connectorId: "conn-1",
      startedAt: Date.now(),
    };

    await recordSyncSuccess(mockDb, handle, {
      documentsProcessed: 10,
      documentsFailed: 0,
      documentsDeleted: 0,
    });

    const calls = mockUpsertHourlyMetrics.mock.calls;
    const metricsCall = calls.at(-1) as unknown[];
    const metricsInput = metricsCall[1] as {
      periodStart: Date;
      periodEnd: Date;
    };

    expect(metricsInput.periodStart.getMinutes()).toBe(0);
    expect(metricsInput.periodStart.getSeconds()).toBe(0);
    expect(metricsInput.periodStart.getMilliseconds()).toBe(0);

    const diffMs =
      metricsInput.periodEnd.getTime() - metricsInput.periodStart.getTime();
    expect(diffMs).toBe(3_600_000);
  });
});

describe("recordSyncFailure", () => {
  test("fails run, upserts metrics, and invalidates cache", async () => {
    mockFailSyncRun.mockResolvedValueOnce({});
    mockUpsertHourlyMetrics.mockResolvedValueOnce({});
    mockInvalidateHealthCache.mockResolvedValueOnce(undefined);

    const handle = {
      id: "run-789",
      definitionId: "def-1",
      connectorId: "conn-1",
      startedAt: Date.now() - 3000,
    };

    await recordSyncFailure(mockDb, handle, "Connection refused");

    expect(mockFailSyncRun).toHaveBeenCalledWith(
      mockDb,
      "run-789",
      "Connection refused"
    );

    expect(mockUpsertHourlyMetrics).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        definitionId: "def-1",
        success: false,
        documentsProcessed: 0,
        errorCount: 1,
      })
    );

    expect(mockInvalidateHealthCache).toHaveBeenCalledWith("conn-1");
  });
});
