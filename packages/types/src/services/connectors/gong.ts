import { z } from "zod";

export interface GongClientConfig {
  connectorId: string;
  accessKey: string;
  accessKeySecret: string;
  timeout?: number;
}

export interface GongSyncCursor {
  lastSyncTime?: number;
  lastCallCursor?: string;
  lastUserCursor?: string;
}

export interface GongTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  syncTranscripts: boolean;
}

export interface GongSyncBatch<T> {
  items: T[];
  cursor: GongSyncCursor;
  stage: string;
  hasMore: boolean;
}

export const GongSyncOptionsSchema = z.object({
  batchSize: z.number().min(1).max(100).default(100),
  lookbackDays: z.number().min(0).default(90),
  syncTranscripts: z.boolean().default(true),
  callDirectionFilter: z.string().default(""),
});

export type GongSyncOptions = z.infer<typeof GongSyncOptionsSchema>;
