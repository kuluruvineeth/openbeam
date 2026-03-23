import { z } from "zod";

export const GreenhouseSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type GreenhouseSyncCursor = z.infer<typeof GreenhouseSyncCursorSchema>;

export interface GreenhouseTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
}

export interface GreenhouseSyncBatch<T> {
  items: T[];
  cursor: GreenhouseSyncCursor;
  stage: string;
  hasMore: boolean;
}

export interface GreenhouseClientConfig {
  connectorId: string;
  apiKey: string;
  timeout?: number;
}

export const GreenhouseSyncOptionsSchema = z.object({
  batchSize: z.number().min(1).max(500).default(100),
  syncCandidates: z.boolean().default(true),
  syncApplications: z.boolean().default(true),
  syncOffers: z.boolean().default(false),
  lookbackDays: z.number().min(0).default(0),
  statusFilter: z.string().default(""),
  departmentFilter: z.string().default(""),
});

export type GreenhouseSyncOptions = z.infer<typeof GreenhouseSyncOptionsSchema>;
