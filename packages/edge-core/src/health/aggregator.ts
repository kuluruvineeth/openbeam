import type {
  EdgeHealthReport,
  HardwareMetrics,
  SearchMetrics,
  ServiceCheck,
  ServiceStatus,
  SyncMetrics,
} from "@openplane/types/edge/health";
import { EdgeHealthReportSchema } from "@openplane/types/edge/health";

type CheckFn = () => Promise<ServiceCheck>;

export class HealthAggregator {
  private readonly nodeId: string;
  private readonly checks = new Map<string, CheckFn>();
  private hardwareMetrics: HardwareMetrics | null = null;
  private searchMetrics: SearchMetrics | null = null;
  private syncMetrics: SyncMetrics | null = null;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  registerCheck(name: string, checkFn: CheckFn): void {
    this.checks.set(name, checkFn);
  }

  removeCheck(name: string): void {
    this.checks.delete(name);
  }

  setHardwareMetrics(metrics: HardwareMetrics): void {
    this.hardwareMetrics = metrics;
  }

  setSearchMetrics(metrics: SearchMetrics): void {
    this.searchMetrics = metrics;
  }

  setSyncMetrics(metrics: SyncMetrics): void {
    this.syncMetrics = metrics;
  }

  async collect(): Promise<EdgeHealthReport> {
    const serviceChecks: ServiceCheck[] = [];

    for (const [name, checkFn] of this.checks) {
      try {
        const check = await checkFn();
        serviceChecks.push(check);
      } catch (err) {
        serviceChecks.push({
          name,
          status: "unhealthy",
          message: err instanceof Error ? err.message : String(err),
          lastCheckedAt: Date.now(),
        });
      }
    }

    const report: EdgeHealthReport = {
      nodeId: this.nodeId,
      timestamp: Date.now(),
      overallStatus: this.computeOverallStatus(serviceChecks),
      hardware: this.hardwareMetrics ?? defaultHardwareMetrics(),
      services: serviceChecks,
      search: this.searchMetrics ?? defaultSearchMetrics(),
      sync: this.syncMetrics ?? defaultSyncMetrics(),
    };

    return EdgeHealthReportSchema.parse(report);
  }

  computeOverallStatus(checks: ServiceCheck[]): ServiceStatus {
    if (checks.length === 0) {
      return "unknown";
    }

    const hasUnhealthy = checks.some((c) => c.status === "unhealthy");
    if (hasUnhealthy) {
      return "unhealthy";
    }

    const hasDegraded = checks.some((c) => c.status === "degraded");
    if (hasDegraded) {
      return "degraded";
    }

    return "healthy";
  }
}

function defaultHardwareMetrics(): HardwareMetrics {
  return {
    cpuUsagePercent: 0,
    ramUsedMb: 0,
    ramTotalMb: 1,
    storageUsedMb: 0,
    storageTotalMb: 1,
    uptimeSeconds: 0,
  };
}

function defaultSearchMetrics(): SearchMetrics {
  return {
    totalDocuments: 0,
    indexSizeMb: 0,
    avgQueryLatencyMs: 0,
    queriesPerMinute: 0,
  };
}

function defaultSyncMetrics(): SyncMetrics {
  return {
    pendingEvents: 0,
    failedEvents: 0,
    outboundQueueSizeMb: 0,
  };
}
