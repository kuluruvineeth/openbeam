import { z } from "zod";

export const LookerStudioSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  pageToken: z.string().optional(),
  forceFullSync: z.boolean().optional(),
});

export type LookerStudioSyncCursor = z.infer<
  typeof LookerStudioSyncCursorSchema
>;

export const LookerStudioTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  domain: z.string(),
});

export type LookerStudioTransformContext = z.infer<
  typeof LookerStudioTransformContextSchema
>;

export interface LookerStudioSyncBatch<T> {
  items: T[];
  cursor: LookerStudioSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export const LookerStudioClientConfigSchema = z.object({
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

export type LookerStudioClientConfig = z.infer<
  typeof LookerStudioClientConfigSchema
>;

export interface LookerStudioRateLimitState {
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}
