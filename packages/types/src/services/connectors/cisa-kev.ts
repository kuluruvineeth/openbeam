import { z } from "zod";

export const CISA_KEV_FEED_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

export const CISA_KEV_GITHUB_URL =
  "https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json";

export const CisaKevVulnerabilitySchema = z.object({
  cveID: z.string(),
  vendorProject: z.string(),
  product: z.string(),
  vulnerabilityName: z.string(),
  dateAdded: z.string(),
  shortDescription: z.string(),
  requiredAction: z.string(),
  dueDate: z.string(),
  knownRansomwareCampaignUse: z.enum(["Known", "Unknown"]),
  notes: z.string().optional(),
  cwes: z.array(z.string()).optional(),
});

export type CisaKevVulnerability = z.infer<typeof CisaKevVulnerabilitySchema>;

export const CisaKevCatalogSchema = z.object({
  title: z.string(),
  catalogVersion: z.string(),
  dateReleased: z.string(),
  count: z.number(),
  vulnerabilities: z.array(CisaKevVulnerabilitySchema),
});

export type CisaKevCatalog = z.infer<typeof CisaKevCatalogSchema>;

export const CisaKevSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  catalogVersion: z.string().optional(),
  lastCount: z.number().optional(),
});

export type CisaKevSyncCursor = z.infer<typeof CisaKevSyncCursorSchema>;

export interface CisaKevSyncOptions {
  cursor?: CisaKevSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const CisaKevSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface CisaKevSyncBatch<T> {
  items: T[];
  cursor: CisaKevSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof CisaKevSyncBatchStatsSchema>;
}

export interface CisaKevTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
}

export const CisaKevErrorCodes = {
  FETCH_FAILED: "FETCH_FAILED",
  PARSE_ERROR: "PARSE_ERROR",
  TIMEOUT: "TIMEOUT",
} as const;

export type CisaKevErrorCode =
  (typeof CisaKevErrorCodes)[keyof typeof CisaKevErrorCodes];
