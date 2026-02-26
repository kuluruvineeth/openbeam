import { z } from "zod";

export const GITHUB_API_URL = "https://api.github.com";
export const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

export const GitHubUserSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().nullable().optional(),
  avatar_url: z.string(),
  email: z.string().nullable().optional(),
  type: z.enum(["User", "Bot", "Organization"]),
  html_url: z.string(),
});

export type GitHubUser = z.infer<typeof GitHubUserSchema>;

export const GitHubLabelSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
  description: z.string().nullable(),
});

export type GitHubLabel = z.infer<typeof GitHubLabelSchema>;

export const GitHubMilestoneSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  state: z.enum(["open", "closed"]),
  description: z.string().nullable(),
  due_on: z.string().nullable(),
});

export type GitHubMilestone = z.infer<typeof GitHubMilestoneSchema>;

export const GitHubRepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable(),
  language: z.string().nullable(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  open_issues_count: z.number(),
  visibility: z.string().optional(),
  private: z.boolean(),
  default_branch: z.string(),
  topics: z.array(z.string()).optional(),
  html_url: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  pushed_at: z.string().nullable(),
  owner: GitHubUserSchema,
});

export type GitHubRepository = z.infer<typeof GitHubRepositorySchema>;

export const GitHubIssueSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.enum(["open", "closed"]),
  state_reason: z.string().nullable().optional(),
  labels: z.array(GitHubLabelSchema),
  assignees: z.array(GitHubUserSchema),
  user: GitHubUserSchema.nullable(),
  milestone: GitHubMilestoneSchema.nullable(),
  comments: z.number(),
  html_url: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
  pull_request: z
    .object({
      url: z.string().optional(),
      html_url: z.string().optional(),
    })
    .optional(),
  repository_url: z.string().optional(),
});

export type GitHubIssue = z.infer<typeof GitHubIssueSchema>;

export const GitHubPullRequestSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.enum(["open", "closed"]),
  merged: z.boolean().optional(),
  merged_at: z.string().nullable().optional(),
  merged_by: GitHubUserSchema.nullable().optional(),
  draft: z.boolean().optional(),
  head: z.object({
    ref: z.string(),
    sha: z.string(),
    label: z.string().optional(),
  }),
  base: z.object({
    ref: z.string(),
    sha: z.string(),
    label: z.string().optional(),
  }),
  labels: z.array(GitHubLabelSchema),
  assignees: z.array(GitHubUserSchema),
  requested_reviewers: z.array(GitHubUserSchema).optional(),
  user: GitHubUserSchema.nullable(),
  milestone: GitHubMilestoneSchema.nullable(),
  additions: z.number().optional(),
  deletions: z.number().optional(),
  changed_files: z.number().optional(),
  comments: z.number(),
  review_comments: z.number().optional(),
  html_url: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
});

export type GitHubPullRequest = z.infer<typeof GitHubPullRequestSchema>;

export const GitHubReviewSchema = z.object({
  id: z.number(),
  user: GitHubUserSchema.nullable(),
  state: z.enum([
    "APPROVED",
    "CHANGES_REQUESTED",
    "COMMENTED",
    "DISMISSED",
    "PENDING",
  ]),
  body: z.string().nullable(),
  submitted_at: z.string().nullable(),
  html_url: z.string(),
});

export type GitHubReview = z.infer<typeof GitHubReviewSchema>;

export const GitHubCommentSchema = z.object({
  id: z.number(),
  user: GitHubUserSchema.nullable(),
  body: z.string(),
  html_url: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type GitHubComment = z.infer<typeof GitHubCommentSchema>;

export const GitHubCommitAuthorSchema = z.object({
  name: z.string(),
  email: z.string(),
  date: z.string(),
});

export const GitHubCommitSchema = z.object({
  sha: z.string(),
  commit: z.object({
    message: z.string(),
    author: GitHubCommitAuthorSchema.nullable(),
    committer: GitHubCommitAuthorSchema.nullable(),
  }),
  author: GitHubUserSchema.nullable(),
  committer: GitHubUserSchema.nullable(),
  html_url: z.string(),
  stats: z
    .object({
      additions: z.number(),
      deletions: z.number(),
      total: z.number(),
    })
    .optional(),
});

export type GitHubCommit = z.infer<typeof GitHubCommitSchema>;

export const GitHubDiscussionSchema = z.object({
  id: z.string(),
  number: z.number(),
  title: z.string(),
  body: z.string(),
  category: z.object({
    id: z.string(),
    name: z.string(),
    emoji: z.string().optional(),
  }),
  author: z
    .object({
      login: z.string(),
      avatarUrl: z.string().optional(),
    })
    .nullable(),
  answer: z
    .object({
      body: z.string(),
      author: z
        .object({
          login: z.string(),
        })
        .nullable(),
    })
    .nullable()
    .optional(),
  url: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  comments: z.object({
    totalCount: z.number(),
  }),
});

export type GitHubDiscussion = z.infer<typeof GitHubDiscussionSchema>;

export const GitHubSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  reposCursor: z.number().optional(),
  syncedRepos: z.array(z.string()).optional(),
  repoTimestamps: z.record(z.string(), z.number()).optional(),
});

export type GitHubSyncCursor = z.infer<typeof GitHubSyncCursorSchema>;

export interface GitHubSyncOptions {
  cursor?: GitHubSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  syncComments?: boolean;
  syncPRs?: boolean;
  syncDiscussions?: boolean;
  syncCommits?: boolean;
  lookbackDays?: number;
  repoFilter?: string[];
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
  onReposDiscovered?: (repos: GitHubRepository[]) => Promise<void>;
}

export const GitHubSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface GitHubSyncBatch<T> {
  items: T[];
  cursor: GitHubSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof GitHubSyncBatchStatsSchema>;
}

export interface GitHubUserLookup {
  get(login: string): GitHubUser | undefined;
  getName(login: string): string | undefined;
  getAvatar(login: string): string | undefined;
  has(login: string): boolean;
  size: number;
}

export interface GitHubTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  organizationName?: string;
  installationId?: string;
  userLookup?: GitHubUserLookup;
}

export const GitHubRateLimitConfigSchema = z.object({
  restRequestsPerHour: z.number().optional(),
  graphqlPointsPerHour: z.number().optional(),
  burstLimit: z.number().optional(),
});

export type GitHubRateLimitConfig = z.infer<typeof GitHubRateLimitConfigSchema>;

export const GitHubClientConfigSchema = z.object({
  connectorId: z.string(),
  accessToken: z.string().optional(),
  rateLimitConfig: GitHubRateLimitConfigSchema.optional(),
  timeout: z.number().optional(),
  debug: z.boolean().optional(),
});

export type GitHubClientConfig = z.infer<typeof GitHubClientConfigSchema>;

export const GitHubRateLimitStateSchema = z.object({
  remaining: z.number(),
  resetAt: z.number(),
  retryAfter: z.number().optional(),
});

export type GitHubRateLimitState = z.infer<typeof GitHubRateLimitStateSchema>;

export const GitHubErrorCodes = {
  RATE_LIMITED: "RATE_LIMITED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_SERVER_ERROR",
  ABUSE_LIMIT: "ABUSE_LIMIT",
} as const;

export type GitHubErrorCode =
  (typeof GitHubErrorCodes)[keyof typeof GitHubErrorCodes];

export interface GitHubApiErrorOptions {
  message: string;
  code: string;
  retryable?: boolean;
  retryAfter?: number;
  status?: number;
}

export const GitHubWebhookPayloadSchema = z.object({
  action: z.string(),
  sender: GitHubUserSchema.optional(),
  repository: GitHubRepositorySchema.optional(),
  organization: z
    .object({
      id: z.number(),
      login: z.string(),
    })
    .optional(),
  installation: z
    .object({
      id: z.number(),
    })
    .optional(),
});

export type GitHubWebhookPayload = z.infer<typeof GitHubWebhookPayloadSchema>;

export const GitHubConnectorConfigSchema = z.object({
  organizationName: z.string().optional(),
  webhook_secret: z.string().optional(),
});

export type GitHubConnectorConfig = z.infer<typeof GitHubConnectorConfigSchema>;
