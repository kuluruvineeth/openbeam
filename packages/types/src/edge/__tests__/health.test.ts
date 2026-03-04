import { describe, expect, it } from "bun:test";
import {
  type EdgeHealthReport,
  EdgeHealthReportSchema,
  HardwareMetricsSchema,
  SearchMetricsSchema,
  ServiceCheckSchema,
  ServiceStatusSchema,
  SyncMetricsSchema,
} from "../health";

const NOW = Date.now();

describe("ServiceStatusSchema", () => {
  it("accepts valid statuses", () => {
    for (const s of ["healthy", "degraded", "unhealthy", "unknown"]) {
      expect(ServiceStatusSchema.parse(s)).toBe(s);
    }
  });

  it("rejects invalid status", () => {
    expect(() => ServiceStatusSchema.parse("broken")).toThrow();
  });
});

describe("HardwareMetricsSchema", () => {
  it("parses valid metrics", () => {
    const metrics = HardwareMetricsSchema.parse({
      cpuUsagePercent: 45.2,
      ramUsedMb: 4096,
      ramTotalMb: 8192,
      storageUsedMb: 20_000,
      storageTotalMb: 50_000,
      uptimeSeconds: 86_400,
    });
    expect(metrics.cpuUsagePercent).toBe(45.2);
    expect(metrics.gpuUsagePercent).toBeUndefined();
  });

  it("rejects cpu usage over 100", () => {
    expect(() =>
      HardwareMetricsSchema.parse({
        cpuUsagePercent: 101,
        ramUsedMb: 0,
        ramTotalMb: 1,
        storageUsedMb: 0,
        storageTotalMb: 1,
        uptimeSeconds: 0,
      })
    ).toThrow();
  });

  it("allows gpu fields", () => {
    const metrics = HardwareMetricsSchema.parse({
      cpuUsagePercent: 30,
      ramUsedMb: 2048,
      ramTotalMb: 4096,
      storageUsedMb: 5000,
      storageTotalMb: 10_000,
      gpuUsagePercent: 80,
      gpuMemoryUsedMb: 3072,
      temperatureCelsius: 65,
      uptimeSeconds: 3600,
    });
    expect(metrics.gpuUsagePercent).toBe(80);
    expect(metrics.temperatureCelsius).toBe(65);
  });
});

describe("ServiceCheckSchema", () => {
  it("parses valid check", () => {
    const check = ServiceCheckSchema.parse({
      name: "fts5",
      status: "healthy",
      latencyMs: 12,
      lastCheckedAt: NOW,
    });
    expect(check.name).toBe("fts5");
    expect(check.message).toBeUndefined();
  });
});

describe("SearchMetricsSchema", () => {
  it("parses search metrics", () => {
    const metrics = SearchMetricsSchema.parse({
      totalDocuments: 50_000,
      indexSizeMb: 120,
      avgQueryLatencyMs: 45,
      queriesPerMinute: 10,
    });
    expect(metrics.totalDocuments).toBe(50_000);
  });
});

describe("SyncMetricsSchema", () => {
  it("parses sync metrics with optional fields", () => {
    const metrics = SyncMetricsSchema.parse({
      pendingEvents: 42,
      failedEvents: 2,
      outboundQueueSizeMb: 5.3,
    });
    expect(metrics.pendingEvents).toBe(42);
    expect(metrics.lastSyncAt).toBeUndefined();
    expect(metrics.syncLagMs).toBeUndefined();
  });
});

describe("EdgeHealthReportSchema", () => {
  it("parses full report", () => {
    const report: EdgeHealthReport = EdgeHealthReportSchema.parse({
      nodeId: "edge-1",
      timestamp: NOW,
      overallStatus: "healthy",
      hardware: {
        cpuUsagePercent: 30,
        ramUsedMb: 2048,
        ramTotalMb: 8192,
        storageUsedMb: 10_000,
        storageTotalMb: 50_000,
        uptimeSeconds: 86_400,
      },
      services: [
        { name: "fts5", status: "healthy", latencyMs: 5, lastCheckedAt: NOW },
        { name: "vector", status: "degraded", lastCheckedAt: NOW },
      ],
      search: {
        totalDocuments: 10_000,
        indexSizeMb: 50,
        avgQueryLatencyMs: 35,
        queriesPerMinute: 5,
      },
      sync: {
        lastSyncAt: NOW - 60_000,
        pendingEvents: 0,
        failedEvents: 0,
        outboundQueueSizeMb: 0,
      },
    });
    expect(report.services).toHaveLength(2);
    expect(report.overallStatus).toBe("healthy");
  });

  it("rejects missing required fields", () => {
    expect(() =>
      EdgeHealthReportSchema.parse({
        nodeId: "edge-1",
        timestamp: NOW,
      })
    ).toThrow();
  });
});
