import { z } from "zod";

export const NetsuiteSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type NetsuiteSyncCursor = z.infer<typeof NetsuiteSyncCursorSchema>;

export const NetsuiteTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  accountId: z.string(),
});

export type NetsuiteTransformContext = z.infer<
  typeof NetsuiteTransformContextSchema
>;

export interface NetsuiteSyncBatch<T> {
  items: T[];
  cursor: NetsuiteSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export const NetsuiteClientConfigSchema = z.object({
  connectorId: z.string(),
  accountId: z.string(),
  consumerKey: z.string(),
  consumerSecret: z.string(),
  tokenKey: z.string(),
  tokenSecret: z.string(),
  timeout: z.number().optional(),
});

export type NetsuiteClientConfig = z.infer<typeof NetsuiteClientConfigSchema>;
