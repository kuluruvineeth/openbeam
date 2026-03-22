import { z } from "zod";

export const FIGMA_API_URL = "https://api.figma.com/v1";

export const FigmaUserSchema = z.object({
  id: z.string(),
  handle: z.string(),
  img_url: z.string().optional(),
  email: z.string().optional(),
});

export type FigmaUser = z.infer<typeof FigmaUserSchema>;

export const FigmaProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type FigmaProject = z.infer<typeof FigmaProjectSchema>;

export const FigmaFileMetaSchema = z.object({
  key: z.string(),
  name: z.string(),
  thumbnail_url: z.string().optional(),
  last_modified: z.string(),
});

export type FigmaFileMeta = z.infer<typeof FigmaFileMetaSchema>;

export const FigmaPageSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal("CANVAS"),
});

export type FigmaPage = z.infer<typeof FigmaPageSchema>;

export const FigmaComponentSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  containing_frame: z
    .object({
      name: z.string().optional(),
      nodeId: z.string().optional(),
      pageName: z.string().optional(),
    })
    .optional(),
});

export type FigmaComponent = z.infer<typeof FigmaComponentSchema>;

export const FigmaFileDetailSchema = z.object({
  name: z.string(),
  lastModified: z.string(),
  thumbnailUrl: z.string().optional(),
  version: z.string(),
  role: z.string(),
  document: z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal("DOCUMENT"),
    children: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
      })
    ),
  }),
  components: z.record(z.string(), FigmaComponentSchema).optional(),
});

export type FigmaFileDetail = z.infer<typeof FigmaFileDetailSchema>;

export const FigmaCommentSchema = z.object({
  id: z.string(),
  message: z.string(),
  file_key: z.string().optional(),
  parent_id: z.string().optional(),
  user: FigmaUserSchema,
  created_at: z.string(),
  resolved_at: z.string().nullable().optional(),
  order_id: z.string().optional(),
});

export type FigmaComment = z.infer<typeof FigmaCommentSchema>;

export const FigmaSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  processedProjects: z.array(z.string()).optional(),
  processedFiles: z.array(z.string()).optional(),
});

export type FigmaSyncCursor = z.infer<typeof FigmaSyncCursorSchema>;

export interface FigmaSyncOptions {
  cursor?: FigmaSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  syncComments?: boolean;
  syncComponents?: boolean;
  lookbackDays?: number;
  includeProjects?: string[];
  excludeProjects?: string[];
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const FigmaSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface FigmaSyncBatch<T> {
  items: T[];
  cursor: FigmaSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof FigmaSyncBatchStatsSchema>;
}

export interface FigmaTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  figmaTeamId?: string;
}

export const FigmaClientConfigSchema = z.object({
  connectorId: z.string(),
  accessToken: z.string().optional(),
  timeout: z.number().optional(),
});

export type FigmaClientConfig = z.infer<typeof FigmaClientConfigSchema>;

export const FigmaErrorCodes = {
  RATE_LIMITED: "RATE_LIMITED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type FigmaErrorCode =
  (typeof FigmaErrorCodes)[keyof typeof FigmaErrorCodes];

export const FigmaApiErrorOptionsSchema = z.object({
  message: z.string(),
  code: z.string(),
  statusCode: z.number().optional(),
  retryable: z.boolean().optional(),
  retryAfter: z.number().optional(),
});

export type FigmaApiErrorOptions = z.infer<typeof FigmaApiErrorOptionsSchema>;
