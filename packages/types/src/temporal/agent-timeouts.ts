import { z } from "zod";

export const TimeoutTierSchema = z.enum([
  "quick",
  "standard",
  "extended",
  "marathon",
]);

export type TimeoutTier = z.infer<typeof TimeoutTierSchema>;

export const TimeoutTierConfigSchema = z.object({
  tier: TimeoutTierSchema,
  startToCloseTimeout: z.string(),
  scheduleToCloseTimeout: z.string(),
  heartbeatTimeout: z.string(),
  heartbeatIntervalMs: z.number(),
  maxChunksPerStep: z.number(),
  chunkTimeoutMs: z.number(),
  checkpointEveryNChunks: z.number(),
});

export type TimeoutTierConfig = z.infer<typeof TimeoutTierConfigSchema>;

export const TIMEOUT_TIERS: Record<TimeoutTier, TimeoutTierConfig> = {
  quick: {
    tier: "quick",
    startToCloseTimeout: "5m",
    scheduleToCloseTimeout: "10m",
    heartbeatTimeout: "30s",
    heartbeatIntervalMs: 10_000,
    maxChunksPerStep: 5,
    chunkTimeoutMs: 60_000,
    checkpointEveryNChunks: 2,
  },
  standard: {
    tier: "standard",
    startToCloseTimeout: "30m",
    scheduleToCloseTimeout: "1h",
    heartbeatTimeout: "2m",
    heartbeatIntervalMs: 40_000,
    maxChunksPerStep: 20,
    chunkTimeoutMs: 90_000,
    checkpointEveryNChunks: 3,
  },
  extended: {
    tier: "extended",
    startToCloseTimeout: "2h",
    scheduleToCloseTimeout: "4h",
    heartbeatTimeout: "5m",
    heartbeatIntervalMs: 100_000,
    maxChunksPerStep: 100,
    chunkTimeoutMs: 120_000,
    checkpointEveryNChunks: 5,
  },
  marathon: {
    tier: "marathon",
    startToCloseTimeout: "24h",
    scheduleToCloseTimeout: "48h",
    heartbeatTimeout: "10m",
    heartbeatIntervalMs: 200_000,
    maxChunksPerStep: 1000,
    chunkTimeoutMs: 300_000,
    checkpointEveryNChunks: 10,
  },
};

export const AgentTimeoutOverrideSchema = z.object({
  tier: TimeoutTierSchema.optional(),
  maxSteps: z.number().int().positive().optional(),
  maxChunksPerStep: z.number().int().positive().optional(),
});

export type AgentTimeoutOverride = z.infer<typeof AgentTimeoutOverrideSchema>;
