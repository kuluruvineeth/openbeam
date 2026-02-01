import { z } from "zod";

export const SyncMetricsSchema = z.object({
  documentsAdded: z.number(),
  documentsUpdated: z.number(),
  documentsRemoved: z.number(),
  filesDiscovered: z.number(),
  mediaDiscovered: z.number(),
  totalIndexed: z.number(),
  durationMs: z.number(),
  status: z.enum(["RUNNING", "COMPLETED", "FAILED", "CANCELLED"]),
});

export type SyncMetrics = z.infer<typeof SyncMetricsSchema>;

export const SyncStatusDisplaySchema = z.object({
  connector: z.object({
    status: z.enum([
      "SYNCING",
      "ACTIVE",
      "ERROR",
      "INACTIVE",
      "CONNECTING",
      "DELETING",
    ]),
    lastSyncedAt: z.date().nullable(),
    lastError: z.string().nullable(),
  }),
  latestSync: SyncMetricsSchema.nullable(),
  processing: z.object({
    files: z.number(),
    media: z.number(),
  }),
  stats: z.object({
    totalIndexed: z.number(),
  }),
});

export type SyncStatusDisplay = z.infer<typeof SyncStatusDisplaySchema>;
