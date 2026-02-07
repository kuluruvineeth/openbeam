import { Connection } from "@temporalio/client";
import { loadTemporalConfig, type TemporalConfig } from "../config";

export interface HealthStatus {
  healthy: boolean;
  latencyMs: number;
  details: {
    connected: boolean;
    namespace?: string;
    serverVersion?: string;
    error?: string;
  };
}

export interface ClusterInfo {
  serverVersion: string;
  clusterName: string;
  namespace: string;
  historyShardCount: number;
}

export async function checkHealth(
  config?: TemporalConfig
): Promise<HealthStatus> {
  const startTime = Date.now();
  const resolvedConfig = config ?? loadTemporalConfig();

  try {
    const connection = await Connection.connect({
      address: resolvedConfig.address,
    });

    try {
      const systemInfo = await connection.workflowService.getSystemInfo({});

      return {
        healthy: true,
        latencyMs: Date.now() - startTime,
        details: {
          connected: true,
          namespace: resolvedConfig.namespace,
          serverVersion: systemInfo.serverVersion ?? "unknown",
        },
      };
    } finally {
      await connection.close();
    }
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - startTime,
      details: {
        connected: false,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function getClusterInfo(
  config?: TemporalConfig
): Promise<ClusterInfo | null> {
  const resolvedConfig = config ?? loadTemporalConfig();

  try {
    const connection = await Connection.connect({
      address: resolvedConfig.address,
    });

    try {
      const systemInfo = await connection.workflowService.getSystemInfo({});
      const clusterInfo = await connection.workflowService.getClusterInfo({});

      return {
        serverVersion: systemInfo.serverVersion ?? "unknown",
        clusterName: clusterInfo.clusterName ?? "default",
        namespace: resolvedConfig.namespace,
        historyShardCount: clusterInfo.historyShardCount ?? 0,
      };
    } finally {
      await connection.close();
    }
  } catch {
    return null;
  }
}

export async function waitForHealthy(
  config?: TemporalConfig,
  options: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<boolean> {
  const { timeoutMs = 30_000, intervalMs = 1000 } = options;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const status = await checkHealth(config);
    if (status.healthy) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}
