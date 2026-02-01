import { z } from "zod";

export const LINEAR_API_URL = "https://api.linear.app/graphql";

export const LinearUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  avatarUrl: z.string().nullable(),
  displayName: z.string(),
  active: z.boolean(),
});

export type LinearUser = z.infer<typeof LinearUserSchema>;

export const LinearTeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  description: z.string().nullable(),
});

export type LinearTeam = z.infer<typeof LinearTeamSchema>;

export const LinearLabelSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  description: z.string().nullable(),
});

export type LinearLabel = z.infer<typeof LinearLabelSchema>;

export const LinearStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  type: z.string(),
});

export type LinearState = z.infer<typeof LinearStateSchema>;

export const LinearCommentSchema = z.object({
  id: z.string(),
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: LinearUserSchema.nullable(),
  issue: z.object({ id: z.string() }),
});

export type LinearComment = z.infer<typeof LinearCommentSchema>;

export const LinearIssueSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  priority: z.number(),
  priorityLabel: z.string(),
  estimate: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().nullable(),
  canceledAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  dueDate: z.string().nullable(),
  url: z.string(),
  state: LinearStateSchema,
  team: LinearTeamSchema,
  assignee: LinearUserSchema.nullable(),
  creator: LinearUserSchema.nullable(),
  labels: z.object({ nodes: z.array(LinearLabelSchema) }),
  parent: z.object({ id: z.string(), identifier: z.string() }).nullable(),
  project: z.object({ id: z.string(), name: z.string() }).nullable(),
  cycle: z.object({ id: z.string(), name: z.string().nullable() }).nullable(),
});

export type LinearIssue = z.infer<typeof LinearIssueSchema>;

export const LinearProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  state: z.string(),
  progress: z.number(),
  targetDate: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  canceledAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().nullable(),
  url: z.string(),
  lead: LinearUserSchema.nullable(),
  teams: z.object({ nodes: z.array(LinearTeamSchema) }),
});

export type LinearProject = z.infer<typeof LinearProjectSchema>;

export const LinearDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().nullable(),
  url: z.string(),
  creator: LinearUserSchema.nullable(),
  project: z.object({ id: z.string(), name: z.string() }).nullable(),
});

export type LinearDocument = z.infer<typeof LinearDocumentSchema>;

export const LinearCycleSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  number: z.number(),
  startsAt: z.string(),
  endsAt: z.string(),
  completedAt: z.string().nullable(),
  progress: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().nullable(),
  team: LinearTeamSchema,
});

export type LinearCycle = z.infer<typeof LinearCycleSchema>;

export const LinearPageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  startCursor: z.string().nullable(),
  endCursor: z.string().nullable(),
});

export type LinearPageInfo = z.infer<typeof LinearPageInfoSchema>;

export function LinearConnectionSchema<T extends z.ZodTypeAny>(nodeSchema: T) {
  return z.object({
    nodes: z.array(nodeSchema),
    pageInfo: LinearPageInfoSchema,
  });
}

export const LinearWebhookPayloadSchema = z.object({
  action: z.enum(["create", "update", "remove"]),
  type: z.string(),
  createdAt: z.string(),
  webhookTimestamp: z.number(),
  webhookId: z.string(),
  url: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
  updatedFrom: z.record(z.string(), z.unknown()).optional(),
});

export type LinearWebhookPayload = z.infer<typeof LinearWebhookPayloadSchema>;

export const LinearSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  issuesCursor: z.string().optional(),
  projectsCursor: z.string().optional(),
  documentsCursor: z.string().optional(),
  cyclesCursor: z.string().optional(),
  syncedTeams: z.array(z.string()).optional(),
});

export type LinearSyncCursor = z.infer<typeof LinearSyncCursorSchema>;

export interface LinearSyncOptions {
  cursor?: LinearSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  syncComments?: boolean;
  syncDocuments?: boolean;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
  onTeamsDiscovered?: (
    teams: Array<{ id: string; name: string }>
  ) => Promise<void>;
}

export const LinearSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface LinearSyncBatch<T> {
  items: T[];
  cursor: LinearSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof LinearSyncBatchStatsSchema>;
}

export interface LinearUserLookup {
  get(userId: string): LinearUser | undefined;
  getName(userId: string): string | undefined;
  getAvatar(userId: string): string | undefined;
  has(userId: string): boolean;
  size: number;
}

export interface LinearTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  organizationName?: string;
  urlKey?: string;
  userLookup?: LinearUserLookup;
}

export const LinearRateLimitConfigSchema = z.object({
  requestsPerMinute: z.number().optional(),
  requestsPerHour: z.number().optional(),
  burstLimit: z.number().optional(),
});

export type LinearRateLimitConfig = z.infer<typeof LinearRateLimitConfigSchema>;

export const LinearClientConfigSchema = z.object({
  connectorId: z.string(),
  accessToken: z.string().optional(),
  rateLimitConfig: LinearRateLimitConfigSchema.optional(),
  timeout: z.number().optional(),
  debug: z.boolean().optional(),
});

export type LinearClientConfig = z.infer<typeof LinearClientConfigSchema>;

export const LinearRateLimitStateSchema = z.object({
  remaining: z.number(),
  resetAt: z.number(),
  retryAfter: z.number().optional(),
});

export type LinearRateLimitState = z.infer<typeof LinearRateLimitStateSchema>;

export const LinearErrorCodes = {
  RATE_LIMITED: "RATELIMITED",
  UNAUTHORIZED: "AUTHENTICATION_ERROR",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "GRAPHQL_VALIDATION_FAILED",
  INTERNAL_ERROR: "INTERNAL_SERVER_ERROR",
} as const;

export type LinearErrorCode =
  (typeof LinearErrorCodes)[keyof typeof LinearErrorCodes];

export const LinearApiErrorOptionsSchema = z.object({
  message: z.string(),
  code: z.string(),
  retryable: z.boolean().optional(),
  retryAfter: z.number().optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
});

export type LinearApiErrorOptions = z.infer<typeof LinearApiErrorOptionsSchema>;
