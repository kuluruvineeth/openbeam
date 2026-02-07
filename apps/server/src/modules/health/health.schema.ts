import { z } from "zod";

export const SystemHealthResponseSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  timestamp: z.number(),
  vespa: z.object({
    status: z.enum(["healthy", "unhealthy", "unknown"]),
    latency_ms: z.number().optional(),
    error: z.string().optional(),
  }),
  worker: z.object({
    status: z.enum(["healthy", "unhealthy", "unknown"]),
    error: z.string().optional(),
  }),
  temporal: z
    .object({
      status: z.enum(["healthy", "unhealthy", "unknown"]),
      error: z.string().optional(),
    })
    .optional(),
});

export type SystemHealthResponse = z.infer<typeof SystemHealthResponseSchema>;
