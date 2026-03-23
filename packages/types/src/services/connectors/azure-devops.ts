import { z } from "zod";

export const AzureDevOpsSyncCursorSchema = z.object({
  lastSyncTime: z.string().optional(),
  lastFullSync: z.number().optional(),
});

export type AzureDevOpsSyncCursor = z.infer<typeof AzureDevOpsSyncCursorSchema>;

export const AzureDevOpsTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  baseUrl: z.string(),
  organization: z.string(),
});

export type AzureDevOpsTransformContext = z.infer<
  typeof AzureDevOpsTransformContextSchema
>;

export interface AzureDevOpsSyncBatch<T> {
  items: T[];
  cursor: AzureDevOpsSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export const AzureDevOpsRateLimitConfigSchema = z.object({
  requestsPerMinute: z.number().optional(),
  burstLimit: z.number().optional(),
});

export type AzureDevOpsRateLimitConfig = z.infer<
  typeof AzureDevOpsRateLimitConfigSchema
>;

export const AzureDevOpsClientConfigSchema = z.object({
  connectorId: z.string(),
  organization: z.string(),
  accessToken: z.string(),
  rateLimitConfig: AzureDevOpsRateLimitConfigSchema.optional(),
  timeout: z.number().optional(),
});

export type AzureDevOpsClientConfig = z.infer<
  typeof AzureDevOpsClientConfigSchema
>;

export const AzureDevOpsErrorCodes = {
  RATE_LIMITED: "RATE_LIMITED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type AzureDevOpsErrorCode =
  (typeof AzureDevOpsErrorCodes)[keyof typeof AzureDevOpsErrorCodes];
