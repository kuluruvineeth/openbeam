import { z } from "zod";

export const HealthStatusSchema = z.enum([
  "healthy",
  "degraded",
  "unhealthy",
  "unknown",
]);

export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const CheckStatusSchema = z.enum(["pass", "fail", "warn", "skip"]);

export type CheckStatus = z.infer<typeof CheckStatusSchema>;

export const HealthCheckSchema = z.object({
  name: z.string(),
  status: CheckStatusSchema,
  message: z.string().optional(),
  latencyMs: z.number().optional(),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;

export const ConnectorHealthResultSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  connectorName: z.string(),
  status: HealthStatusSchema,
  checks: z.array(HealthCheckSchema),
  checkedAt: z.date(),
});

export type ConnectorHealthResult = z.infer<typeof ConnectorHealthResultSchema>;

export const BatchHealthCheckResultSchema = z.object({
  results: z.array(ConnectorHealthResultSchema),
  checkedAt: z.date(),
  successCount: z.number(),
  failureCount: z.number(),
  degradedCount: z.number(),
});

export type BatchHealthCheckResult = z.infer<
  typeof BatchHealthCheckResultSchema
>;

export interface HealthCheckContext {
  db: unknown;
  connectorId: string;
  teamId: string;
}
