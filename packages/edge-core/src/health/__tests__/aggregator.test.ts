import { describe, expect, test } from "bun:test";
import type {
  HardwareMetrics,
  SearchMetrics,
  ServiceCheck,
  SyncMetrics,
} from "@openplane/types/edge/health";
import { EdgeHealthReportSchema } from "@openplane/types/edge/health";
import { HealthAggregator } from "../aggregator";

function createHealthyCheck(name: string): ServiceCheck {
  return { name, status: "healthy", lastCheckedAt: Date.now() };
}

function createDegradedCheck(name: string): ServiceCheck {
  return {
    name,
    status: "degraded",
    message: "high latency",
    lastCheckedAt: Date.now(),
  };
}

function createUnhealthyCheck(name: string): ServiceCheck {
  return {
    name,
    status: "unhealthy",
    message: "unreachable",
    lastCheckedAt: Date.now(),
  };
}

const SAMPLE_HARDWARE: HardwareMetrics = {
  cpuUsagePercent: 45,
  ramUsedMb: 2048,
  ramTotalMb: 8192,
  storageUsedMb: 50_000,
  storageTotalMb: 100_000,
  uptimeSeconds: 86_400,
};

const SAMPLE_SEARCH: SearchMetrics = {
  totalDocuments: 10_000,
  indexSizeMb: 256,
  avgQueryLatencyMs: 15,
  queriesPerMinute: 120,
};

const SAMPLE_SYNC: SyncMetrics = {
  lastSyncAt: Date.now() - 60_000,
  pendingEvents: 5,
  failedEvents: 0,
  outboundQueueSizeMb: 1.2,
  syncLagMs: 500,
};

describe("HealthAggregator", () => {
  test("collect with no checks returns unknown status", async () => {
    const aggregator = new HealthAggregator("node-1");
    const report = await aggregator.collect();

    expect(report.overallStatus).toBe("unknown");
    expect(report.services).toHaveLength(0);
    expect(report.nodeId).toBe("node-1");
  });

  test("registerCheck adds a check", async () => {
    const aggregator = new HealthAggregator("node-2");
    aggregator.registerCheck("db", async () => createHealthyCheck("db"));

    const report = await aggregator.collect();
    expect(report.services).toHaveLength(1);
    expect(report.services[0]?.name).toBe("db");
  });

  test("removeCheck removes a check", async () => {
    const aggregator = new HealthAggregator("node-3");
    aggregator.registerCheck("db", async () => createHealthyCheck("db"));
    aggregator.registerCheck("cache", async () => createHealthyCheck("cache"));

    aggregator.removeCheck("db");

    const report = await aggregator.collect();
    expect(report.services).toHaveLength(1);
    expect(report.services[0]?.name).toBe("cache");
  });

  test("collect runs all registered checks", async () => {
    const aggregator = new HealthAggregator("node-4");
    aggregator.registerCheck("db", async () => createHealthyCheck("db"));
    aggregator.registerCheck("cache", async () => createHealthyCheck("cache"));
    aggregator.registerCheck("search", async () =>
      createHealthyCheck("search")
    );

    const report = await aggregator.collect();
    expect(report.services).toHaveLength(3);

    const names = report.services.map((s) => s.name).sort();
    expect(names).toEqual(["cache", "db", "search"]);
  });

  test("computeOverallStatus: all healthy returns healthy", () => {
    const aggregator = new HealthAggregator("node-5");
    const checks = [
      createHealthyCheck("a"),
      createHealthyCheck("b"),
      createHealthyCheck("c"),
    ];

    expect(aggregator.computeOverallStatus(checks)).toBe("healthy");
  });

  test("computeOverallStatus: one degraded returns degraded", () => {
    const aggregator = new HealthAggregator("node-6");
    const checks = [
      createHealthyCheck("a"),
      createDegradedCheck("b"),
      createHealthyCheck("c"),
    ];

    expect(aggregator.computeOverallStatus(checks)).toBe("degraded");
  });

  test("computeOverallStatus: one unhealthy returns unhealthy", () => {
    const aggregator = new HealthAggregator("node-7");
    const checks = [
      createHealthyCheck("a"),
      createUnhealthyCheck("b"),
      createHealthyCheck("c"),
    ];

    expect(aggregator.computeOverallStatus(checks)).toBe("unhealthy");
  });

  test("computeOverallStatus: mixed degraded and unhealthy returns unhealthy", () => {
    const aggregator = new HealthAggregator("node-8");
    const checks = [
      createDegradedCheck("a"),
      createUnhealthyCheck("b"),
      createHealthyCheck("c"),
    ];

    expect(aggregator.computeOverallStatus(checks)).toBe("unhealthy");
  });

  test("computeOverallStatus: empty returns unknown", () => {
    const aggregator = new HealthAggregator("node-9");
    expect(aggregator.computeOverallStatus([])).toBe("unknown");
  });

  test("collect includes hardware metrics", async () => {
    const aggregator = new HealthAggregator("node-10");
    aggregator.setHardwareMetrics(SAMPLE_HARDWARE);

    const report = await aggregator.collect();

    expect(report.hardware.cpuUsagePercent).toBe(45);
    expect(report.hardware.ramUsedMb).toBe(2048);
    expect(report.hardware.ramTotalMb).toBe(8192);
    expect(report.hardware.uptimeSeconds).toBe(86_400);
  });

  test("collect includes search metrics", async () => {
    const aggregator = new HealthAggregator("node-11");
    aggregator.setSearchMetrics(SAMPLE_SEARCH);

    const report = await aggregator.collect();

    expect(report.search.totalDocuments).toBe(10_000);
    expect(report.search.indexSizeMb).toBe(256);
    expect(report.search.avgQueryLatencyMs).toBe(15);
    expect(report.search.queriesPerMinute).toBe(120);
  });

  test("collect includes sync metrics", async () => {
    const aggregator = new HealthAggregator("node-12");
    aggregator.setSyncMetrics(SAMPLE_SYNC);

    const report = await aggregator.collect();

    expect(report.sync.pendingEvents).toBe(5);
    expect(report.sync.failedEvents).toBe(0);
    expect(report.sync.outboundQueueSizeMb).toBe(1.2);
    expect(report.sync.syncLagMs).toBe(500);
  });

  test("collect includes nodeId and timestamp", async () => {
    const aggregator = new HealthAggregator("edge-node-42");
    const before = Date.now();
    const report = await aggregator.collect();
    const after = Date.now();

    expect(report.nodeId).toBe("edge-node-42");
    expect(report.timestamp).toBeGreaterThanOrEqual(before);
    expect(report.timestamp).toBeLessThanOrEqual(after);
  });

  test("setHardwareMetrics, setSearchMetrics, setSyncMetrics store metrics", async () => {
    const aggregator = new HealthAggregator("node-14");

    aggregator.setHardwareMetrics(SAMPLE_HARDWARE);
    aggregator.setSearchMetrics(SAMPLE_SEARCH);
    aggregator.setSyncMetrics(SAMPLE_SYNC);

    const report = await aggregator.collect();

    expect(report.hardware.cpuUsagePercent).toBe(
      SAMPLE_HARDWARE.cpuUsagePercent
    );
    expect(report.search.totalDocuments).toBe(SAMPLE_SEARCH.totalDocuments);
    expect(report.sync.pendingEvents).toBe(SAMPLE_SYNC.pendingEvents);
  });

  test("collect handles check that throws and marks as unhealthy", async () => {
    const aggregator = new HealthAggregator("node-15");
    aggregator.registerCheck("failing-service", () =>
      Promise.reject(new Error("connection refused"))
    );
    aggregator.registerCheck("ok-service", async () =>
      createHealthyCheck("ok-service")
    );

    const report = await aggregator.collect();

    expect(report.services).toHaveLength(2);

    const failedService = report.services.find(
      (s) => s.name === "failing-service"
    );
    expect(failedService?.status).toBe("unhealthy");
    expect(failedService?.message).toBe("connection refused");

    expect(report.overallStatus).toBe("unhealthy");
  });

  test("report matches EdgeHealthReportSchema validation", async () => {
    const aggregator = new HealthAggregator("node-16");
    aggregator.setHardwareMetrics(SAMPLE_HARDWARE);
    aggregator.setSearchMetrics(SAMPLE_SEARCH);
    aggregator.setSyncMetrics(SAMPLE_SYNC);
    aggregator.registerCheck("db", async () => createHealthyCheck("db"));

    const report = await aggregator.collect();

    const parsed = EdgeHealthReportSchema.safeParse(report);
    expect(parsed.success).toBe(true);
  });

  test("collect uses default metrics when none set", async () => {
    const aggregator = new HealthAggregator("node-17");
    const report = await aggregator.collect();

    expect(report.hardware.cpuUsagePercent).toBe(0);
    expect(report.hardware.ramTotalMb).toBe(1);
    expect(report.search.totalDocuments).toBe(0);
    expect(report.sync.pendingEvents).toBe(0);
    expect(report.sync.failedEvents).toBe(0);
  });
});
