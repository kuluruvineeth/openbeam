import { z } from "zod";

export const SystemHealthResponseSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  timestamp: z.number(),
  queues: z.object({
    sync: z.object({
      waiting: z.number(),
      active: z.number(),
      failed: z.number(),
      delayed: z.number(),
    }),
    index: z.object({
      waiting: z.number(),
      active: z.number(),
      failed: z.number(),
      delayed: z.number(),
    }),
    webhook: z.object({
      waiting: z.number(),
      active: z.number(),
      failed: z.number(),
    }),
  }),
  vespa: z.object({
    status: z.enum(["healthy", "unhealthy", "unknown"]),
    latency_ms: z.number().optional(),
    error: z.string().optional(),
  }),
  worker: z.object({
    status: z.enum(["healthy", "unhealthy", "unknown"]),
    error: z.string().optional(),
  }),
});

export type SystemHealthResponse = z.infer<typeof SystemHealthResponseSchema>;
