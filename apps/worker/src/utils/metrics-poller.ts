import {
  getIndexQueueMetrics,
  getSyncQueueMetrics,
  indexQueue,
  sharedBullMqConnection,
  syncQueue,
} from "@openplane/redis";
import {
  indexQueueDepth,
  redisConnectionStatus,
  redisConnectionsTotal,
  scheduledJobsTotal,
  syncQueueDepth,
} from "../metrics";
import logger from "./logger";

export class MetricsPoller {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly pollInterval: number;

  constructor(pollInterval = 15_000) {
    this.pollInterval = pollInterval;
  }

  start(): void {
    if (this.intervalId) {
      logger.warn("MetricsPoller already running");
      return;
    }

    logger.info({ pollInterval: this.pollInterval }, "Starting MetricsPoller");

    this.pollMetrics().catch((error) => {
      logger.error({ error }, "Initial metrics poll failed");
    });

    this.intervalId = setInterval(() => {
      this.pollMetrics().catch((error) => {
        logger.error({ error }, "Metrics poll failed");
      });
    }, this.pollInterval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("MetricsPoller stopped");
    }
  }

  private async pollMetrics(): Promise<void> {
    await Promise.allSettled([
      this.pollQueueDepths(),
      this.pollScheduledJobs(),
      this.pollRedisConnections(),
    ]);
  }

  private async pollQueueDepths(): Promise<void> {
    try {
      const syncMetrics = await getSyncQueueMetrics();
      syncQueueDepth.set({ status: "waiting" }, syncMetrics.waiting);
      syncQueueDepth.set({ status: "active" }, syncMetrics.active);
      syncQueueDepth.set({ status: "failed" }, syncMetrics.failed);
      syncQueueDepth.set({ status: "delayed" }, syncMetrics.delayed);

      const indexMetrics = await getIndexQueueMetrics();
      indexQueueDepth.set({ status: "waiting" }, indexMetrics.waiting);
      indexQueueDepth.set({ status: "active" }, indexMetrics.active);
      indexQueueDepth.set({ status: "failed" }, indexMetrics.failed);
      indexQueueDepth.set({ status: "delayed" }, indexMetrics.delayed);

      logger.debug(
        {
          sync: syncMetrics,
          index: indexMetrics,
        },
        "Queue depths updated"
      );
    } catch (error) {
      logger.error({ error }, "Failed to poll queue depths");
    }
  }

  private async pollScheduledJobs(): Promise<void> {
    try {
      const syncSchedulers = await syncQueue.getJobSchedulers();
      scheduledJobsTotal.set({ queue: "sync" }, syncSchedulers.length);

      const indexSchedulers = await indexQueue.getJobSchedulers();
      scheduledJobsTotal.set({ queue: "index" }, indexSchedulers.length);

      logger.debug(
        {
          sync: syncSchedulers.length,
          index: indexSchedulers.length,
        },
        "Scheduled jobs count updated"
      );
    } catch (error) {
      logger.error({ error }, "Failed to poll scheduled jobs");
    }
  }

  private async pollRedisConnections(): Promise<void> {
    try {
      if (sharedBullMqConnection) {
        const status = sharedBullMqConnection.status;
        const isConnected = status === "ready" || status === "connect";
        redisConnectionStatus.set({ type: "bullmq" }, isConnected ? 1 : 0);

        try {
          const info = await sharedBullMqConnection.info("clients");
          const clientInfo = this.parseRedisInfo(info);
          const connectedClients = clientInfo.connected_clients || 0;
          redisConnectionsTotal.set({ type: "bullmq" }, connectedClients);
        } catch (infoError) {
          logger.debug({ error: infoError }, "Failed to get Redis client info");
        }
      }
    } catch (error) {
      logger.error({ error }, "Failed to poll Redis connection metrics");
    }
  }

  private parseRedisInfo(info: string | undefined): Record<string, number> {
    if (!info) {
      return {};
    }

    const result: Record<string, number> = {};
    const lines = info.split("\r\n");
    for (const line of lines) {
      if (line.includes(":")) {
        const parts = line.split(":");
        const key = parts[0];
        const value = parts.slice(1).join(":");
        if (key && value) {
          const numValue = Number.parseInt(value, 10);
          if (!Number.isNaN(numValue)) {
            result[key] = numValue;
          }
        }
      }
    }
    return result;
  }
}

export const metricsPoller = new MetricsPoller();
