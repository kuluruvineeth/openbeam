import { z } from "zod";

export const PHABRICATOR_RATE_LIMIT_PER_MINUTE = 120;

export const PhabricatorSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type PhabricatorSyncCursor = z.infer<typeof PhabricatorSyncCursorSchema>;

export const PhabricatorTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  instanceUrl: z.string(),
});

export type PhabricatorTransformContext = z.infer<
  typeof PhabricatorTransformContextSchema
>;

export interface PhabricatorSyncBatch<T> {
  items: T[];
  cursor: PhabricatorSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export interface PhabricatorSyncOptions {
  cursor?: PhabricatorSyncCursor;
  batchSize?: number;
  syncWikiPages?: boolean;
  syncRepositories?: boolean;
  syncProjects?: boolean;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const PhabricatorClientConfigSchema = z.object({
  connectorId: z.string(),
  apiToken: z.string(),
  instanceUrl: z.string(),
  timeout: z.number().optional(),
});

export type PhabricatorClientConfig = z.infer<
  typeof PhabricatorClientConfigSchema
>;
