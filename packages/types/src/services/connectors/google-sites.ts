import { z } from "zod";

export const GoogleSitesSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  pageToken: z.string().optional(),
  forceFullSync: z.boolean().optional(),
});

export type GoogleSitesSyncCursor = z.infer<typeof GoogleSitesSyncCursorSchema>;

export const GoogleSitesTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  domain: z.string(),
});

export type GoogleSitesTransformContext = z.infer<
  typeof GoogleSitesTransformContextSchema
>;

export interface GoogleSitesSyncBatch<T> {
  items: T[];
  cursor: GoogleSitesSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export const GoogleSitesClientConfigSchema = z.object({
  connectorId: z.string(),
  accessToken: z.string().optional(),
  userEmail: z.string().optional(),
  rateLimitConfig: z
    .object({
      requestsPerMinute: z.number(),
      requestsPerHour: z.number(),
      burstLimit: z.number(),
    })
    .optional(),
  timeout: z.number().optional(),
  debug: z.boolean().optional(),
});

export type GoogleSitesClientConfig = z.infer<
  typeof GoogleSitesClientConfigSchema
>;

export interface GoogleSitesRateLimitState {
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}
