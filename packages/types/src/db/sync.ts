import { z } from "zod";
import type { JsonValue } from "../common/json";

export const SyncJobInfoSchema = z.object({
  id: z.string(),
  type: z.string(),
  schedule: z.string().nullable(),
  nextRunAt: z.date().nullable(),
  lastRanAt: z.date().nullable(),
  config: z.record(z.string(), z.unknown()),
  priority: z.number().int(),
  status: z.string(),
});

export type SyncJobInfo = z.infer<typeof SyncJobInfoSchema>;

export const ProcessingStatusSchema = z.object({
  filesProcessing: z.number().int(),
  filesIndexed: z.number().int(),
  mediaProcessing: z.number().int(),
  mediaIndexed: z.number().int(),
});

export type ProcessingStatus = z.infer<typeof ProcessingStatusSchema>;

export const LatestSyncSchema = z.object({
  id: z.string(),
  status: z.string(),
  dataAdded: z.number().int(),
  dataUpdated: z.number().int(),
  dataDeleted: z.number().int(),
  startedAt: z.date(),
  finishedAt: z.date().nullable(),
  errorMessage: z.string().nullable(),
  durationMs: z.number().int().nullable(),
  summary: z.unknown(),
});

export interface LatestSync {
  id: string;
  status: string;
  dataAdded: number;
  dataUpdated: number;
  dataDeleted: number;
  startedAt: Date;
  finishedAt: Date | null;
  errorMessage: string | null;
  durationMs: number | null;
  summary: JsonValue;
}

export const WebhookStatusSchema = z.object({
  enabled: z.boolean(),
  lastReceivedAt: z.date().nullable(),
  configured: z.boolean(),
});

export type WebhookStatus = z.infer<typeof WebhookStatusSchema>;

export const ConnectorSyncStatusSchema = z.object({
  id: z.string(),
  status: z.string(),
  lastSyncedAt: z.date().nullable(),
  lastSyncStatus: z.string().nullable(),
  lastError: z.string().nullable(),
  lastErrorAt: z.date().nullable(),
  scheduledDeletionAt: z.date().nullable(),
});

export type ConnectorSyncStatus = z.infer<typeof ConnectorSyncStatusSchema>;

export interface GetSyncStatusResult {
  connector: ConnectorSyncStatus;
  latestSync: LatestSync | null;
  stats: { totalIndexed: number };
  processing: ProcessingStatus;
  resources: { total: number };
  syncHistory: { total: number };
  syncJobs: {
    full: SyncJobInfo | null;
    incremental: SyncJobInfo | null;
  };
  webhookStatus: WebhookStatus;
}

export const SyncHistoryItemSchema = z.object({
  id: z.string(),
  status: z.string(),
  dataAdded: z.number().int(),
  dataUpdated: z.number().int(),
  dataDeleted: z.number().int(),
  errorMessage: z.string().nullable(),
  summary: z.unknown(),
  startedAt: z.date(),
  finishedAt: z.date().nullable(),
  durationMs: z.number().int().nullable(),
  syncJob: z
    .object({
      type: z.string(),
      trigger: z.string(),
    })
    .nullable(),
});

export interface SyncHistoryItem {
  id: string;
  status: string;
  dataAdded: number;
  dataUpdated: number;
  dataDeleted: number;
  errorMessage: string | null;
  summary: JsonValue;
  startedAt: Date;
  finishedAt: Date | null;
  durationMs: number | null;
  syncJob: { type: string; trigger: string } | null;
}

export const PaginationSchema = z.object({
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
  hasMore: z.boolean(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export interface GetSyncHistoryResult {
  connectorId: string;
  history: SyncHistoryItem[];
  pagination: Pagination;
}

export const ScheduledSyncJobSchema = z.object({
  id: z.string(),
  connectorId: z.string(),
  type: z.string(),
  schedule: z.string().nullable(),
  priority: z.number().int(),
  config: z.unknown(),
});

export type ScheduledSyncJob = z.infer<typeof ScheduledSyncJobSchema>;

export const SyncCategorySchema = z.enum(["FULL", "INCREMENTAL"]);

export type SyncCategory = z.infer<typeof SyncCategorySchema>;

export const WebhookSyncCategorySchema = z.enum([
  "FULL",
  "INCREMENTAL",
  "PERMISSIONS",
]);

export type WebhookSyncCategory = z.infer<typeof WebhookSyncCategorySchema>;

export const TriggerSyncInputSchema = z.object({
  connectorId: z.string(),
  type: SyncCategorySchema,
});

export type TriggerSyncInput = z.infer<typeof TriggerSyncInputSchema>;

export const TriggerSyncResultSchema = z.object({
  syncJobId: z.string(),
  syncHistoryId: z.string(),
  type: SyncCategorySchema,
});

export type TriggerSyncResult = z.infer<typeof TriggerSyncResultSchema>;

export const TriggerWebhookSyncInputSchema = z.object({
  connectorId: z.string(),
  type: WebhookSyncCategorySchema,
});

export type TriggerWebhookSyncInput = z.infer<
  typeof TriggerWebhookSyncInputSchema
>;

export const TriggerWebhookSyncResultSchema = z.object({
  syncJobId: z.string(),
  syncHistoryId: z.string(),
});

export type TriggerWebhookSyncResult = z.infer<
  typeof TriggerWebhookSyncResultSchema
>;

export const UpdateSyncSettingsInputSchema = z.object({
  connectorId: z.string(),
  fullSyncIntervalMs: z.number().int().positive().optional(),
  incrementalSyncIntervalMs: z.number().int().positive().optional(),
});

export type UpdateSyncSettingsInput = z.infer<
  typeof UpdateSyncSettingsInputSchema
>;

export const SyncJobSettingsSchema = z.object({
  id: z.string(),
  intervalMs: z.number().int(),
  schedule: z.string(),
  nextRunAt: z.date(),
});

export type SyncJobSettings = z.infer<typeof SyncJobSettingsSchema>;

export const UpdateSyncSettingsResultSchema = z.object({
  fullSyncJob: SyncJobSettingsSchema.nullable(),
  incrementalSyncJob: SyncJobSettingsSchema.nullable(),
});

export type UpdateSyncSettingsResult = z.infer<
  typeof UpdateSyncSettingsResultSchema
>;
