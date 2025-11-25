/**
 * Worker Configuration
 *
 * Centralized configuration for all worker components.
 * Aligned with enterprise-grade schemas and capabilities.
 */

export const workerConfig = {
  // === Sync Processor ===
  sync: {
    concurrency: Number.parseInt(process.env.SYNC_CONCURRENCY || "5", 10),
    rateLimit: {
      max: Number.parseInt(process.env.SYNC_RATE_LIMIT_MAX || "10", 10),
      duration: 1000, // 10 jobs/sec
    },
    timeout: Number.parseInt(process.env.SYNC_TIMEOUT_MS || "3600000", 10), // 1 hour
    maxRetries: Number.parseInt(process.env.SYNC_MAX_RETRIES || "3", 10),
  },

  // === Index Processor ===
  index: {
    concurrency: Number.parseInt(process.env.INDEX_CONCURRENCY || "10", 10),
    rateLimit: {
      max: Number.parseInt(process.env.INDEX_RATE_LIMIT_MAX || "50", 10),
      duration: 1000, // 50 jobs/sec
    },
    timeout: Number.parseInt(process.env.INDEX_TIMEOUT_MS || "60000", 10), // 1 minute
    maxRetries: Number.parseInt(process.env.INDEX_MAX_RETRIES || "2", 10),
    batchSize: Number.parseInt(process.env.INDEX_BATCH_SIZE || "100", 10),
  },

  // === Webhook Processor ===
  webhook: {
    concurrency: Number.parseInt(process.env.WEBHOOK_CONCURRENCY || "20", 10),
    rateLimit: {
      max: Number.parseInt(process.env.WEBHOOK_RATE_LIMIT_MAX || "100", 10),
      duration: 1000, // 100 webhooks/sec
    },
    timeout: Number.parseInt(process.env.WEBHOOK_TIMEOUT_MS || "30000", 10), // 30 seconds
    maxRetries: Number.parseInt(process.env.WEBHOOK_MAX_RETRIES || "3", 10),
  },

  // === Cleanup Processor ===
  cleanup: {
    concurrency: Number.parseInt(process.env.CLEANUP_CONCURRENCY || "2", 10),
    schedule: process.env.CLEANUP_SCHEDULE || "0 2 * * *", // Daily at 2 AM
    intervalMs: Number.parseInt(
      process.env.CLEANUP_INTERVAL_MS || "86400000",
      10
    ), // 24 hours
    staleDocumentDays: Number.parseInt(
      process.env.CLEANUP_STALE_DAYS || "30",
      10
    ),
    orphanDocumentDays: Number.parseInt(
      process.env.CLEANUP_ORPHAN_DAYS || "7",
      10
    ),
  },

  // === Agent Processor (NEW) ===
  agent: {
    concurrency: Number.parseInt(process.env.AGENT_CONCURRENCY || "3", 10),
    rateLimit: {
      max: Number.parseInt(process.env.AGENT_RATE_LIMIT_MAX || "5", 10),
      duration: 1000, // 5 agents/sec (expensive operations)
    },
    timeout: Number.parseInt(process.env.AGENT_TIMEOUT_MS || "300000", 10), // 5 minutes
    maxSteps: Number.parseInt(process.env.AGENT_MAX_STEPS || "10", 10),
    maxTokensPerStep: Number.parseInt(
      process.env.AGENT_MAX_TOKENS_PER_STEP || "4096",
      10
    ),
    maxTotalTokens: Number.parseInt(
      process.env.AGENT_MAX_TOTAL_TOKENS || "50000",
      10
    ),
  },

  // === Action Processor (NEW) ===
  action: {
    concurrency: Number.parseInt(process.env.ACTION_CONCURRENCY || "10", 10),
    rateLimit: {
      max: Number.parseInt(process.env.ACTION_RATE_LIMIT_MAX || "20", 10),
      duration: 1000, // 20 actions/sec
    },
    timeout: Number.parseInt(process.env.ACTION_TIMEOUT_MS || "60000", 10), // 1 minute
    maxRetries: Number.parseInt(process.env.ACTION_MAX_RETRIES || "3", 10),
    confirmationTimeout: Number.parseInt(
      process.env.ACTION_CONFIRMATION_TIMEOUT_MS || "300000",
      10
    ), // 5 minutes
  },

  // === Analytics Processor (NEW) ===
  analytics: {
    concurrency: Number.parseInt(process.env.ANALYTICS_CONCURRENCY || "5", 10),
    rateLimit: {
      max: Number.parseInt(process.env.ANALYTICS_RATE_LIMIT_MAX || "100", 10),
      duration: 1000, // 100 events/sec
    },
    aggregationInterval: Number.parseInt(
      process.env.ANALYTICS_AGGREGATION_INTERVAL_MS || "300000",
      10
    ), // 5 minutes
    popularityUpdateInterval: Number.parseInt(
      process.env.ANALYTICS_POPULARITY_UPDATE_MS || "3600000",
      10
    ), // 1 hour
  },

  // === Notification Processor (NEW) ===
  notification: {
    concurrency: Number.parseInt(
      process.env.NOTIFICATION_CONCURRENCY || "10",
      10
    ),
    rateLimit: {
      max: Number.parseInt(process.env.NOTIFICATION_RATE_LIMIT_MAX || "50", 10),
      duration: 1000, // 50 notifications/sec
    },
    timeout: Number.parseInt(
      process.env.NOTIFICATION_TIMEOUT_MS || "10000",
      10
    ), // 10 seconds
    emailProvider: process.env.EMAIL_PROVIDER || "sendgrid",
    slackWebhookUrl: process.env.SLACK_NOTIFICATION_WEBHOOK_URL,
  },

  // === Export Processor (NEW) ===
  export: {
    concurrency: Number.parseInt(process.env.EXPORT_CONCURRENCY || "2", 10),
    timeout: Number.parseInt(process.env.EXPORT_TIMEOUT_MS || "1800000", 10), // 30 minutes
    maxFileSizeMb: Number.parseInt(
      process.env.EXPORT_MAX_FILE_SIZE_MB || "100",
      10
    ),
    storageProvider: process.env.EXPORT_STORAGE_PROVIDER || "s3",
    storageBucket: process.env.EXPORT_STORAGE_BUCKET || "openplane-exports",
    expirationDays: Number.parseInt(
      process.env.EXPORT_EXPIRATION_DAYS || "7",
      10
    ),
  },

  // === Sync Scheduler ===
  scheduler: {
    checkIntervalMs: Number.parseInt(
      process.env.SCHEDULER_CHECK_INTERVAL_MS || "3600000",
      10
    ), // 1 hour
    maxConcurrentJobs: Number.parseInt(
      process.env.SCHEDULER_MAX_CONCURRENT || "10",
      10
    ),
    priorityLevels: {
      webhook: 10,
      manual: 7,
      incremental: 5,
      full: 3,
      background: 1,
    },
  },

  // === Batch Size Configuration ===
  batchSize: {
    min: Number.parseInt(process.env.BATCH_SIZE_MIN || "10", 10),
    max: Number.parseInt(process.env.BATCH_SIZE_MAX || "500", 10),
    default: Number.parseInt(process.env.BATCH_SIZE_DEFAULT || "100", 10),
    adaptive: process.env.BATCH_SIZE_ADAPTIVE !== "false", // Enable adaptive sizing
  },

  // === Connection Pool Configuration ===
  connectionPool: {
    slack: {
      max: Number.parseInt(process.env.SLACK_POOL_MAX || "5", 10),
      min: Number.parseInt(process.env.SLACK_POOL_MIN || "1", 10),
      idleTimeout: 30_000,
    },
    notion: {
      max: Number.parseInt(process.env.NOTION_POOL_MAX || "3", 10),
      min: Number.parseInt(process.env.NOTION_POOL_MIN || "1", 10),
      idleTimeout: 30_000,
    },
    drive: {
      max: Number.parseInt(process.env.DRIVE_POOL_MAX || "10", 10),
      min: Number.parseInt(process.env.DRIVE_POOL_MIN || "2", 10),
      idleTimeout: 60_000,
    },
    github: {
      max: Number.parseInt(process.env.GITHUB_POOL_MAX || "5", 10),
      min: Number.parseInt(process.env.GITHUB_POOL_MIN || "1", 10),
      idleTimeout: 30_000,
    },
  },

  // === Circuit Breaker Configuration ===
  circuitBreaker: {
    vespa: {
      failureThreshold: Number.parseInt(
        process.env.CIRCUIT_VESPA_FAILURE_THRESHOLD || "5",
        10
      ),
      recoveryTimeout: Number.parseInt(
        process.env.CIRCUIT_VESPA_RECOVERY_MS || "30000",
        10
      ),
      successThreshold: 2,
    },
    llm: {
      failureThreshold: Number.parseInt(
        process.env.CIRCUIT_LLM_FAILURE_THRESHOLD || "3",
        10
      ),
      recoveryTimeout: Number.parseInt(
        process.env.CIRCUIT_LLM_RECOVERY_MS || "60000",
        10
      ),
      successThreshold: 2,
    },
    connector: {
      failureThreshold: Number.parseInt(
        process.env.CIRCUIT_CONNECTOR_FAILURE_THRESHOLD || "10",
        10
      ),
      recoveryTimeout: Number.parseInt(
        process.env.CIRCUIT_CONNECTOR_RECOVERY_MS || "60000",
        10
      ),
      successThreshold: 3,
    },
  },

  // === Health Check ===
  health: {
    port: Number.parseInt(process.env.HEALTH_PORT || "9092", 10),
    enabled: process.env.HEALTH_ENABLED !== "false",
    checkInterval: Number.parseInt(
      process.env.HEALTH_CHECK_INTERVAL_MS || "30000",
      10
    ),
  },

  // === Metrics ===
  metrics: {
    port: Number.parseInt(process.env.METRICS_PORT || "9091", 10),
    enabled: process.env.METRICS_ENABLED !== "false",
    collectInterval: Number.parseInt(
      process.env.METRICS_COLLECT_INTERVAL_MS || "15000",
      10
    ),
  },

  // === Vespa Configuration ===
  vespa: {
    endpoint: process.env.VESPA_ENDPOINT || "http://localhost:8080",
    timeout: Number.parseInt(process.env.VESPA_TIMEOUT_MS || "30000", 10),
    maxRetries: Number.parseInt(process.env.VESPA_MAX_RETRIES || "3", 10),
    batchSize: Number.parseInt(process.env.VESPA_BATCH_SIZE || "100", 10),
  },

  // === LLM Configuration ===
  llm: {
    provider: process.env.LLM_PROVIDER || "openai",
    model: process.env.LLM_MODEL || "gpt-4",
    embeddingModel: process.env.LLM_EMBEDDING_MODEL || "text-embedding-3-small",
    temperature: Number.parseFloat(process.env.LLM_TEMPERATURE || "0.7"),
    maxTokens: Number.parseInt(process.env.LLM_MAX_TOKENS || "4096", 10),
    endpoint: process.env.LLM_ENDPOINT, // For custom endpoints (Ollama, Azure)
  },

  // === Feature Flags ===
  features: {
    enableAgents: process.env.FEATURE_AGENTS !== "false",
    enableActions: process.env.FEATURE_ACTIONS !== "false",
    enableAnalytics: process.env.FEATURE_ANALYTICS !== "false",
    enableNotifications: process.env.FEATURE_NOTIFICATIONS !== "false",
    enableExports: process.env.FEATURE_EXPORTS !== "false",
    enableEntityExtraction: process.env.FEATURE_ENTITY_EXTRACTION !== "false",
    enableRelationshipExtraction:
      process.env.FEATURE_RELATIONSHIP_EXTRACTION !== "false",
    enableEmbeddings: process.env.FEATURE_EMBEDDINGS !== "false",
  },
} as const;

export type WorkerConfig = typeof workerConfig;

// === Helper Functions ===

/**
 * Get connector-specific pool config
 */
export function getConnectorPoolConfig(connectorType: string) {
  const type = connectorType.toLowerCase();
  return (
    workerConfig.connectionPool[
      type as keyof typeof workerConfig.connectionPool
    ] || {
      max: 5,
      min: 1,
      idleTimeout: 30_000,
    }
  );
}

/**
 * Get circuit breaker config for a service
 */
export function getCircuitBreakerConfig(
  service: "vespa" | "llm" | "connector"
) {
  return workerConfig.circuitBreaker[service];
}
