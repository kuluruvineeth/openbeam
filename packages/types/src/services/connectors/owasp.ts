import { z } from "zod";

export const OWASP_REPOS = {
  top10: {
    owner: "OWASP",
    repo: "Top10",
    contentPath: "2025/docs/en",
    branch: "master",
  },
  cheatSheets: {
    owner: "OWASP",
    repo: "CheatSheetSeries",
    contentPath: "cheatsheets",
    branch: "master",
  },
  asvs: {
    owner: "OWASP",
    repo: "ASVS",
    contentPath: "5.0/docs_en",
    branch: "v5.0.0",
  },
  wstg: {
    owner: "OWASP",
    repo: "wstg",
    contentPath: "document/4-Web_Application_Security_Testing",
    branch: "master",
  },
} as const;

export const OWASP_GITHUB_RAW_BASE = "https://raw.githubusercontent.com";

export type OwaspProject = keyof typeof OWASP_REPOS;

export const OwaspDocumentSchema = z.object({
  path: z.string(),
  name: z.string(),
  content: z.string(),
  sha: z.string(),
  project: z.string(),
  url: z.string().optional(),
});

export type OwaspDocument = z.infer<typeof OwaspDocumentSchema>;

export const OwaspSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  projectsCompleted: z.array(z.string()).optional(),
  lastCommitShas: z.record(z.string(), z.string()).optional(),
  documentsProcessed: z.number().optional(),
});

export type OwaspSyncCursor = z.infer<typeof OwaspSyncCursorSchema>;

export interface OwaspSyncOptions {
  cursor?: OwaspSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  projects?: OwaspProject[];
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const OwaspSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface OwaspSyncBatch<T> {
  items: T[];
  cursor: OwaspSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof OwaspSyncBatchStatsSchema>;
}

export interface OwaspTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  project: string;
}

export const OwaspErrorCodes = {
  FETCH_FAILED: "FETCH_FAILED",
  PARSE_ERROR: "PARSE_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  TIMEOUT: "TIMEOUT",
} as const;

export type OwaspErrorCode =
  (typeof OwaspErrorCodes)[keyof typeof OwaspErrorCodes];
