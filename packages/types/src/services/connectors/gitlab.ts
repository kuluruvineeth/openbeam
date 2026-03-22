import { z } from "zod";

export const GITLAB_DEFAULT_URL = "https://gitlab.com";

export const GitLabUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  name: z.string(),
  avatar_url: z.string().nullable(),
  web_url: z.string(),
  state: z.string().optional(),
});

export type GitLabUser = z.infer<typeof GitLabUserSchema>;

export const GitLabNamespaceSchema = z.object({
  id: z.number(),
  name: z.string(),
  path: z.string(),
  kind: z.enum(["user", "group"]),
  full_path: z.string(),
  web_url: z.string().optional(),
});

export type GitLabNamespace = z.infer<typeof GitLabNamespaceSchema>;

export const GitLabProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  name_with_namespace: z.string(),
  path: z.string(),
  path_with_namespace: z.string(),
  description: z.string().nullable(),
  default_branch: z.string().nullable(),
  visibility: z.enum(["public", "internal", "private"]),
  web_url: z.string(),
  topics: z.array(z.string()).optional(),
  star_count: z.number().optional(),
  forks_count: z.number().optional(),
  open_issues_count: z.number().optional(),
  last_activity_at: z.string(),
  created_at: z.string(),
  namespace: GitLabNamespaceSchema.optional(),
  archived: z.boolean().optional(),
  wiki_enabled: z.boolean().optional(),
  merge_requests_enabled: z.boolean().optional(),
  issues_enabled: z.boolean().optional(),
});

export type GitLabProject = z.infer<typeof GitLabProjectSchema>;

export const GitLabLabelSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
  description: z.string().nullable(),
});

export type GitLabLabel = z.infer<typeof GitLabLabelSchema>;

export const GitLabMilestoneSchema = z.object({
  id: z.number(),
  iid: z.number(),
  title: z.string(),
  state: z.string(),
  description: z.string().nullable(),
  due_date: z.string().nullable(),
});

export type GitLabMilestone = z.infer<typeof GitLabMilestoneSchema>;

export const GitLabIssueSchema = z.object({
  id: z.number(),
  iid: z.number(),
  project_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  state: z.enum(["opened", "closed"]),
  labels: z.array(z.string()),
  assignees: z.array(GitLabUserSchema),
  author: GitLabUserSchema.nullable(),
  milestone: GitLabMilestoneSchema.nullable(),
  weight: z.number().nullable().optional(),
  web_url: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
  user_notes_count: z.number().optional(),
  confidential: z.boolean().optional(),
});

export type GitLabIssue = z.infer<typeof GitLabIssueSchema>;

export const GitLabMergeRequestSchema = z.object({
  id: z.number(),
  iid: z.number(),
  project_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  state: z.enum(["opened", "closed", "merged", "locked"]),
  source_branch: z.string(),
  target_branch: z.string(),
  author: GitLabUserSchema.nullable(),
  assignees: z.array(GitLabUserSchema).optional(),
  reviewers: z.array(GitLabUserSchema).optional(),
  labels: z.array(z.string()),
  milestone: GitLabMilestoneSchema.nullable(),
  draft: z.boolean().optional(),
  merged_by: GitLabUserSchema.nullable().optional(),
  merged_at: z.string().nullable().optional(),
  web_url: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable().optional(),
  user_notes_count: z.number().optional(),
  changes_count: z.string().nullable().optional(),
});

export type GitLabMergeRequest = z.infer<typeof GitLabMergeRequestSchema>;

export const GitLabNoteSchema = z.object({
  id: z.number(),
  body: z.string(),
  author: GitLabUserSchema.nullable(),
  system: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type GitLabNote = z.infer<typeof GitLabNoteSchema>;

export const GitLabSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  projectsCursor: z.number().optional(),
  syncedProjects: z.array(z.string()).optional(),
  projectTimestamps: z.record(z.string(), z.number()).optional(),
});

export type GitLabSyncCursor = z.infer<typeof GitLabSyncCursorSchema>;

export interface GitLabSyncOptions {
  cursor?: GitLabSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  syncMergeRequests?: boolean;
  syncComments?: boolean;
  lookbackDays?: number;
  includeGroups?: string[];
  excludeGroups?: string[];
  visibilityFilter?: string;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
  onProjectsDiscovered?: (projects: GitLabProject[]) => Promise<void>;
}

export const GitLabSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface GitLabSyncBatch<T> {
  items: T[];
  cursor: GitLabSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof GitLabSyncBatchStatsSchema>;
}

export interface GitLabTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  instanceUrl: string;
}

export const GitLabClientConfigSchema = z.object({
  connectorId: z.string(),
  accessToken: z.string().optional(),
  instanceUrl: z.string().optional(),
  timeout: z.number().optional(),
  debug: z.boolean().optional(),
});

export type GitLabClientConfig = z.infer<typeof GitLabClientConfigSchema>;

export const GitLabErrorCodes = {
  RATE_LIMITED: "RATE_LIMITED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_SERVER_ERROR",
} as const;

export type GitLabErrorCode =
  (typeof GitLabErrorCodes)[keyof typeof GitLabErrorCodes];

export interface GitLabApiErrorOptions {
  message: string;
  code: string;
  retryable?: boolean;
  retryAfter?: number;
  status?: number;
}

export const GitLabConnectorConfigSchema = z.object({
  instance_url: z.string().optional(),
  include_groups: z.string().optional(),
  exclude_groups: z.string().optional(),
  visibility_filter: z.string().optional(),
});

export type GitLabConnectorConfig = z.infer<typeof GitLabConnectorConfigSchema>;
