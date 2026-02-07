export const workerConfig = {
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
