import { z } from "zod";

export const BITBUCKET_API_URL = "https://api.bitbucket.org/2.0";

export const BitbucketUserSchema = z.object({
  display_name: z.string(),
  uuid: z.string(),
  nickname: z.string().optional(),
  account_id: z.string().optional(),
  links: z
    .object({
      avatar: z.object({ href: z.string() }).optional(),
      html: z.object({ href: z.string() }).optional(),
    })
    .optional(),
  type: z.string().optional(),
});

export type BitbucketUser = z.infer<typeof BitbucketUserSchema>;

export const BitbucketRepositorySchema = z.object({
  uuid: z.string(),
  slug: z.string(),
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  is_private: z.boolean(),
  created_on: z.string(),
  updated_on: z.string(),
  size: z.number().optional(),
  has_issues: z.boolean().optional(),
  has_wiki: z.boolean().optional(),
  fork_policy: z.string().optional(),
  mainbranch: z
    .object({
      name: z.string(),
      type: z.string().optional(),
    })
    .nullable()
    .optional(),
  owner: BitbucketUserSchema.optional(),
  project: z
    .object({
      key: z.string(),
      name: z.string(),
      uuid: z.string(),
    })
    .optional(),
  links: z
    .object({
      html: z.object({ href: z.string() }).optional(),
      clone: z
        .array(z.object({ href: z.string(), name: z.string() }))
        .optional(),
    })
    .optional(),
});

export type BitbucketRepository = z.infer<typeof BitbucketRepositorySchema>;

export const BitbucketPullRequestSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable().optional(),
  state: z.enum(["OPEN", "MERGED", "DECLINED", "SUPERSEDED"]),
  created_on: z.string(),
  updated_on: z.string(),
  close_source_branch: z.boolean().optional(),
  author: BitbucketUserSchema.optional(),
  source: z
    .object({
      branch: z.object({ name: z.string() }).optional(),
      repository: z
        .object({ full_name: z.string(), uuid: z.string() })
        .optional(),
    })
    .optional(),
  destination: z
    .object({
      branch: z.object({ name: z.string() }).optional(),
      repository: z
        .object({ full_name: z.string(), uuid: z.string() })
        .optional(),
    })
    .optional(),
  reviewers: z.array(BitbucketUserSchema).optional(),
  participants: z
    .array(
      z.object({
        user: BitbucketUserSchema,
        role: z.string(),
        approved: z.boolean(),
        state: z.string().nullable().optional(),
      })
    )
    .optional(),
  merge_commit: z.object({ hash: z.string() }).nullable().optional(),
  closed_by: BitbucketUserSchema.nullable().optional(),
  comment_count: z.number().optional(),
  task_count: z.number().optional(),
  links: z
    .object({
      html: z.object({ href: z.string() }).optional(),
    })
    .optional(),
});

export type BitbucketPullRequest = z.infer<typeof BitbucketPullRequestSchema>;

export const BitbucketIssueSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z
    .object({
      raw: z.string().nullable().optional(),
      markup: z.string().optional(),
      html: z.string().optional(),
    })
    .optional(),
  state: z.string(),
  priority: z.string().optional(),
  kind: z.string().optional(),
  votes: z.number().optional(),
  reporter: BitbucketUserSchema.nullable().optional(),
  assignee: BitbucketUserSchema.nullable().optional(),
  created_on: z.string(),
  updated_on: z.string(),
  component: z.object({ name: z.string() }).nullable().optional(),
  milestone: z.object({ name: z.string() }).nullable().optional(),
  version: z.object({ name: z.string() }).nullable().optional(),
  links: z
    .object({
      html: z.object({ href: z.string() }).optional(),
    })
    .optional(),
});

export type BitbucketIssue = z.infer<typeof BitbucketIssueSchema>;

export const BitbucketCommentSchema = z.object({
  id: z.number(),
  content: z.object({
    raw: z.string().nullable().optional(),
    markup: z.string().optional(),
    html: z.string().optional(),
  }),
  user: BitbucketUserSchema,
  created_on: z.string(),
  updated_on: z.string(),
  links: z
    .object({
      html: z.object({ href: z.string() }).optional(),
    })
    .optional(),
});

export type BitbucketComment = z.infer<typeof BitbucketCommentSchema>;

export const BitbucketSnippetSchema = z.object({
  id: z.string(),
  title: z.string(),
  is_private: z.boolean(),
  created_on: z.string(),
  updated_on: z.string(),
  owner: BitbucketUserSchema.optional(),
  creator: BitbucketUserSchema.optional(),
  links: z
    .object({
      html: z.object({ href: z.string() }).optional(),
    })
    .optional(),
});

export type BitbucketSnippet = z.infer<typeof BitbucketSnippetSchema>;

export const BitbucketPaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T
) =>
  z.object({
    pagelen: z.number(),
    size: z.number().optional(),
    page: z.number().optional(),
    next: z.string().optional(),
    previous: z.string().optional(),
    values: z.array(itemSchema),
  });

export const BitbucketSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  syncedRepos: z.array(z.string()).optional(),
  repoTimestamps: z.record(z.string(), z.number()).optional(),
});

export type BitbucketSyncCursor = z.infer<typeof BitbucketSyncCursorSchema>;

export interface BitbucketSyncOptions {
  cursor?: BitbucketSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  syncIssues?: boolean;
  syncPullRequests?: boolean;
  syncSnippets?: boolean;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
  onReposDiscovered?: (repos: BitbucketRepository[]) => Promise<void>;
}

export const BitbucketSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface BitbucketSyncBatch<T> {
  items: T[];
  cursor: BitbucketSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof BitbucketSyncBatchStatsSchema>;
}

export interface BitbucketTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  workspaceSlug: string;
}

export const BitbucketClientConfigSchema = z.object({
  connectorId: z.string(),
  accessToken: z.string().optional(),
  workspace: z.string(),
  timeout: z.number().optional(),
  debug: z.boolean().optional(),
});

export type BitbucketClientConfig = z.infer<typeof BitbucketClientConfigSchema>;

export const BitbucketRateLimitStateSchema = z.object({
  remaining: z.number(),
  resetAt: z.number(),
  retryAfter: z.number().optional(),
});

export type BitbucketRateLimitState = z.infer<
  typeof BitbucketRateLimitStateSchema
>;

export const BitbucketErrorCodes = {
  RATE_LIMITED: "RATE_LIMITED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_SERVER_ERROR",
} as const;

export type BitbucketErrorCode =
  (typeof BitbucketErrorCodes)[keyof typeof BitbucketErrorCodes];

export interface BitbucketApiErrorOptions {
  message: string;
  code: string;
  retryable?: boolean;
  retryAfter?: number;
  status?: number;
}

export const BitbucketConnectorConfigSchema = z.object({
  workspace: z.string().optional(),
  include_repos: z.string().optional(),
  exclude_repos: z.string().optional(),
});

export type BitbucketConnectorConfig = z.infer<
  typeof BitbucketConnectorConfigSchema
>;
