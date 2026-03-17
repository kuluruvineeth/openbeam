import { z } from "zod";

export const NVD_API_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0";
export const NVD_MAX_RESULTS_PER_PAGE = 500;
export const NVD_MAX_DATE_RANGE_DAYS = 120;
export const NVD_RATE_LIMIT_WINDOW_MS = 30_000;
export const NVD_RATE_LIMIT_NO_KEY = 5;
export const NVD_RATE_LIMIT_WITH_KEY = 50;

export const NvdCvssV31Schema = z.object({
  source: z.string(),
  type: z.string(),
  cvssData: z.object({
    version: z.string(),
    vectorString: z.string(),
    baseScore: z.number(),
    baseSeverity: z.string(),
    attackVector: z.string().optional(),
    attackComplexity: z.string().optional(),
    privilegesRequired: z.string().optional(),
    userInteraction: z.string().optional(),
    scope: z.string().optional(),
    confidentialityImpact: z.string().optional(),
    integrityImpact: z.string().optional(),
    availabilityImpact: z.string().optional(),
  }),
  exploitabilityScore: z.number().optional(),
  impactScore: z.number().optional(),
});

export type NvdCvssV31 = z.infer<typeof NvdCvssV31Schema>;

export const NvdReferenceSchema = z.object({
  url: z.string(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type NvdReference = z.infer<typeof NvdReferenceSchema>;

export const NvdWeaknessSchema = z.object({
  source: z.string(),
  type: z.string(),
  description: z.array(z.object({ lang: z.string(), value: z.string() })),
});

export type NvdWeakness = z.infer<typeof NvdWeaknessSchema>;

export const NvdCveSchema = z.object({
  id: z.string(),
  sourceIdentifier: z.string().optional(),
  published: z.string(),
  lastModified: z.string(),
  vulnStatus: z.string().optional(),
  descriptions: z.array(z.object({ lang: z.string(), value: z.string() })),
  metrics: z
    .object({
      cvssMetricV31: z.array(NvdCvssV31Schema).optional(),
      cvssMetricV30: z.array(z.unknown()).optional(),
      cvssMetricV2: z.array(z.unknown()).optional(),
    })
    .optional(),
  weaknesses: z.array(NvdWeaknessSchema).optional(),
  configurations: z.array(z.unknown()).optional(),
  references: z.array(NvdReferenceSchema).optional(),
  cisaExploitAdd: z.string().optional(),
  cisaActionDue: z.string().optional(),
  cisaRequiredAction: z.string().optional(),
  cisaVulnerabilityName: z.string().optional(),
});

export type NvdCve = z.infer<typeof NvdCveSchema>;

export const NvdApiResponseSchema = z.object({
  resultsPerPage: z.number(),
  startIndex: z.number(),
  totalResults: z.number(),
  format: z.string().optional(),
  version: z.string().optional(),
  timestamp: z.string().optional(),
  vulnerabilities: z.array(z.object({ cve: NvdCveSchema })),
});

export type NvdApiResponse = z.infer<typeof NvdApiResponseSchema>;

export const NvdSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastModifiedDate: z.string().optional(),
  startIndex: z.number().optional(),
  totalResults: z.number().optional(),
  currentWindowStart: z.string().optional(),
  currentWindowEnd: z.string().optional(),
});

export type NvdSyncCursor = z.infer<typeof NvdSyncCursorSchema>;

export interface NvdSyncOptions {
  cursor?: NvdSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  apiKey?: string;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const NvdSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface NvdSyncBatch<T> {
  items: T[];
  cursor: NvdSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof NvdSyncBatchStatsSchema>;
}

export interface NvdTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
}

export const NvdClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string().optional(),
  timeout: z.number().optional(),
});

export type NvdClientConfig = z.infer<typeof NvdClientConfigSchema>;

export const NvdErrorCodes = {
  RATE_LIMITED: "RATE_LIMITED",
  SERVER_ERROR: "SERVER_ERROR",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  TIMEOUT: "TIMEOUT",
} as const;

export type NvdErrorCode = (typeof NvdErrorCodes)[keyof typeof NvdErrorCodes];
