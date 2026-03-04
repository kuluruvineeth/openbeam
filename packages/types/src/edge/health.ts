import { z } from "zod";

export const ServiceStatusSchema = z.enum([
  "healthy",
  "degraded",
  "unhealthy",
  "unknown",
]);

export type ServiceStatus = z.infer<typeof ServiceStatusSchema>;

export const HardwareMetricsSchema = z.object({
  cpuUsagePercent: z.number().min(0).max(100),
  ramUsedMb: z.number().nonnegative(),
  ramTotalMb: z.number().positive(),
  storageUsedMb: z.number().nonnegative(),
  storageTotalMb: z.number().positive(),
  gpuUsagePercent: z.number().min(0).max(100).optional(),
  gpuMemoryUsedMb: z.number().nonnegative().optional(),
  temperatureCelsius: z.number().optional(),
  uptimeSeconds: z.number().nonnegative(),
});

export type HardwareMetrics = z.infer<typeof HardwareMetricsSchema>;

export const ServiceCheckSchema = z.object({
  name: z.string(),
  status: ServiceStatusSchema,
  latencyMs: z.number().nonnegative().optional(),
  message: z.string().optional(),
  lastCheckedAt: z.number(),
});

export type ServiceCheck = z.infer<typeof ServiceCheckSchema>;

export const SearchMetricsSchema = z.object({
  totalDocuments: z.number().int().nonnegative(),
  indexSizeMb: z.number().nonnegative(),
  avgQueryLatencyMs: z.number().nonnegative(),
  queriesPerMinute: z.number().nonnegative(),
});

export type SearchMetrics = z.infer<typeof SearchMetricsSchema>;

export const SyncMetricsSchema = z.object({
  lastSyncAt: z.number().optional(),
  pendingEvents: z.number().int().nonnegative(),
  failedEvents: z.number().int().nonnegative(),
  outboundQueueSizeMb: z.number().nonnegative(),
  syncLagMs: z.number().nonnegative().optional(),
});

export type SyncMetrics = z.infer<typeof SyncMetricsSchema>;

export const EdgeHealthReportSchema = z.object({
  nodeId: z.string(),
  timestamp: z.number(),
  overallStatus: ServiceStatusSchema,
  hardware: HardwareMetricsSchema,
  services: z.array(ServiceCheckSchema),
  search: SearchMetricsSchema,
  sync: SyncMetricsSchema,
});

export type EdgeHealthReport = z.infer<typeof EdgeHealthReportSchema>;
