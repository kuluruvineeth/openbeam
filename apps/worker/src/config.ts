/**
 * Worker Configuration
 * 
 * Centralized configuration for all worker components.
 */

export const workerConfig = {
  // Sync processor configuration
  sync: {
    concurrency: parseInt(process.env.SYNC_CONCURRENCY || "5"),
    rateLimit: {
      max: parseInt(process.env.SYNC_RATE_LIMIT_MAX || "10"),
      duration: 1000, // 10 jobs/sec
    },
  },

  // Index processor configuration
  index: {
    concurrency: parseInt(process.env.INDEX_CONCURRENCY || "10"),
    rateLimit: {
      max: parseInt(process.env.INDEX_RATE_LIMIT_MAX || "50"),
      duration: 1000, // 50 jobs/sec
    },
  },

  // Webhook processor configuration
  webhook: {
    concurrency: parseInt(process.env.WEBHOOK_CONCURRENCY || "20"),
    rateLimit: {
      max: parseInt(process.env.WEBHOOK_RATE_LIMIT_MAX || "100"),
      duration: 1000, // 100 webhooks/sec
    },
  },

  // Cleanup processor configuration
  cleanup: {
    concurrency: parseInt(process.env.CLEANUP_CONCURRENCY || "2"),
    schedule: process.env.CLEANUP_SCHEDULE || "0 2 * * *", // Daily at 2 AM
    intervalMs: parseInt(process.env.CLEANUP_INTERVAL_MS || "86400000"), // 24 hours
    staleDocumentDays: parseInt(process.env.CLEANUP_STALE_DAYS || "30"),
  },

  // Sync scheduler configuration
  scheduler: {
    checkIntervalMs: parseInt(process.env.SCHEDULER_CHECK_INTERVAL_MS || "3600000"), // 1 hour
  },

  // Batch size configuration
  batchSize: {
    min: parseInt(process.env.BATCH_SIZE_MIN || "10"),
    max: parseInt(process.env.BATCH_SIZE_MAX || "500"),
    default: parseInt(process.env.BATCH_SIZE_DEFAULT || "100"),
  },

  // Connection pool configuration
  connectionPool: {
    slack: {
      max: parseInt(process.env.SLACK_POOL_MAX || "5"),
      min: parseInt(process.env.SLACK_POOL_MIN || "1"),
    },
    notion: {
      max: parseInt(process.env.NOTION_POOL_MAX || "3"),
      min: parseInt(process.env.NOTION_POOL_MIN || "1"),
    },
    drive: {
      max: parseInt(process.env.DRIVE_POOL_MAX || "10"),
      min: parseInt(process.env.DRIVE_POOL_MIN || "2"),
    },
  },

  // Health check configuration
  health: {
    port: parseInt(process.env.HEALTH_PORT || "9092"),
    enabled: process.env.HEALTH_ENABLED !== "false",
  },

  // Metrics configuration
  metrics: {
    port: parseInt(process.env.METRICS_PORT || "9091"),
    enabled: process.env.METRICS_ENABLED !== "false",
  },
} as const;

export type WorkerConfig = typeof workerConfig;

