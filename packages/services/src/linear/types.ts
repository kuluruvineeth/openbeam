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

export interface LinearSyncCursor {
  lastSyncTime?: number;
  issuesCursor?: string;
  projectsCursor?: string;
  documentsCursor?: string;
  cyclesCursor?: string;
  syncedTeams?: string[];
}

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

export interface LinearSyncBatch<T> {
  items: T[];
  cursor: LinearSyncCursor;
  hasMore: boolean;
  stats: {
    processed: number;
    skipped: number;
    errors: number;
  };
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

export interface LinearUserLookup {
  get(userId: string): LinearUser | undefined;
  getName(userId: string): string | undefined;
  getAvatar(userId: string): string | undefined;
  has(userId: string): boolean;
  size: number;
}

export interface LinearClientConfig {
  connectorId: string;
  rateLimitConfig?: LinearRateLimitConfig;
  timeout?: number;
  debug?: boolean;
}

export interface LinearRateLimitConfig {
  requestsPerMinute?: number;
  requestsPerHour?: number;
  burstLimit?: number;
}

export interface LinearRateLimitState {
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

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

export interface LinearApiErrorOptions {
  message: string;
  code: string;
  retryable?: boolean;
  retryAfter?: number;
  extensions?: Record<string, unknown>;
}

export class LinearApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;
  readonly extensions?: Record<string, unknown>;

  constructor(options: LinearApiErrorOptions) {
    super(options.message);
    this.name = "LinearApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
    this.extensions = options.extensions;
  }

  static fromGraphQLError(error: {
    message: string;
    extensions?: { code?: string; retryAfter?: number };
  }): LinearApiError {
    const code = error.extensions?.code ?? "UNKNOWN";
    const retryable = code === LinearErrorCodes.RATE_LIMITED;
    return new LinearApiError({
      message: error.message,
      code,
      retryable,
      retryAfter: error.extensions?.retryAfter,
    });
  }

  static isAuthError(code: string): boolean {
    return (
      code === LinearErrorCodes.UNAUTHORIZED ||
      code === LinearErrorCodes.FORBIDDEN
    );
  }

  static isRateLimitError(code: string): boolean {
    return code === LinearErrorCodes.RATE_LIMITED;
  }
}
