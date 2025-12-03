export const workerConfig = {
  sync: {
    concurrency: Number.parseInt(process.env.SYNC_CONCURRENCY || "5", 10),
    rateLimit: {
      max: Number.parseInt(process.env.SYNC_RATE_LIMIT_MAX || "10", 10),
      duration: 1000,
    },
  },

  index: {
    concurrency: Number.parseInt(process.env.INDEX_CONCURRENCY || "10", 10),
    rateLimit: {
      max: Number.parseInt(process.env.INDEX_RATE_LIMIT_MAX || "50", 10),
      duration: 1000,
    },
  },

  webhook: {
    concurrency: Number.parseInt(process.env.WEBHOOK_CONCURRENCY || "20", 10),
    rateLimit: {
      max: Number.parseInt(process.env.WEBHOOK_RATE_LIMIT_MAX || "100", 10),
      duration: 1000,
    },
  },

  cleanup: {
    concurrency: Number.parseInt(process.env.CLEANUP_CONCURRENCY || "2", 10),
    schedule: process.env.CLEANUP_SCHEDULE || "0 2 * * *",
    intervalMs: Number.parseInt(
      process.env.CLEANUP_INTERVAL_MS || "86400000",
      10
    ),
    staleDocumentDays: Number.parseInt(
      process.env.CLEANUP_STALE_DAYS || "30",
      10
    ),
  },

  scheduler: {
    checkIntervalMs: Number.parseInt(
      process.env.SCHEDULER_CHECK_INTERVAL_MS || "3600000",
      10
    ),
  },

  batchSize: {
    min: Number.parseInt(process.env.BATCH_SIZE_MIN || "10", 10),
    max: Number.parseInt(process.env.BATCH_SIZE_MAX || "500", 10),
    default: Number.parseInt(process.env.BATCH_SIZE_DEFAULT || "100", 10),
  },

  connectionPool: {
    slack: {
      max: Number.parseInt(process.env.SLACK_POOL_MAX || "5", 10),
      min: Number.parseInt(process.env.SLACK_POOL_MIN || "1", 10),
    },
    notion: {
      max: Number.parseInt(process.env.NOTION_POOL_MAX || "3", 10),
      min: Number.parseInt(process.env.NOTION_POOL_MIN || "1", 10),
    },
    drive: {
      max: Number.parseInt(process.env.DRIVE_POOL_MAX || "10", 10),
      min: Number.parseInt(process.env.DRIVE_POOL_MIN || "2", 10),
    },
  },

  health: {
    port: Number.parseInt(process.env.HEALTH_PORT || "9092", 10),
    enabled: process.env.HEALTH_ENABLED !== "false",
  },

  metrics: {
    port: Number.parseInt(process.env.METRICS_PORT || "9091", 10),
    enabled: process.env.METRICS_ENABLED !== "false",
  },
} as const;

export type WorkerConfig = typeof workerConfig;
