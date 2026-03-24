import { z } from "zod";

export const CoupaSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type CoupaSyncCursor = z.infer<typeof CoupaSyncCursorSchema>;

export const CoupaTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  instanceUrl: z.string(),
});

export type CoupaTransformContext = z.infer<typeof CoupaTransformContextSchema>;

export interface CoupaSyncBatch<T> {
  items: T[];
  cursor: CoupaSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export const CoupaClientConfigSchema = z.object({
  connectorId: z.string(),
  accessToken: z.string(),
  instanceUrl: z.string(),
  timeout: z.number().optional(),
});

export type CoupaClientConfig = z.infer<typeof CoupaClientConfigSchema>;
