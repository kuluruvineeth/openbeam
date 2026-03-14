import { z } from "zod";

export const DatasetCategorySchema = z.enum([
  "security",
  "government",
  "academic",
  "community",
  "legal",
  "health",
  "financial",
  "standards",
]);

export type DatasetCategory = z.infer<typeof DatasetCategorySchema>;

export const PUBLIC_DATASET_APP_TYPES = [
  "NVD",
  "CISA_KEV",
  "MITRE_ATTACK",
  "OWASP",
] as const;

export const PublicDatasetAppTypeSchema = z.enum(PUBLIC_DATASET_APP_TYPES);

export type PublicDatasetAppType = z.infer<typeof PublicDatasetAppTypeSchema>;

export const DatasetMetadataSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: DatasetCategorySchema,
  sourceUrl: z.string(),
  license: z.string(),
  updateFrequency: z.enum([
    "realtime",
    "hourly",
    "daily",
    "weekly",
    "monthly",
    "quarterly",
    "annual",
    "static",
  ]),
  estimatedDocuments: z.number(),
  dataFormat: z.enum(["json", "xml", "csv", "html", "api", "bulk_download"]),
  apiBaseUrl: z.string().optional(),
  bulkDownloadUrl: z.string().optional(),
});

export type DatasetMetadata = z.infer<typeof DatasetMetadataSchema>;

export const PublicSearchParamsSchema = z.object({
  q: z.string().min(1).max(500),
  dataset: PublicDatasetAppTypeSchema.optional(),
  category: DatasetCategorySchema.optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).max(1000).default(0),
  sort: z.enum(["relevance", "recency"]).default("relevance"),
  dateFrom: z.number().optional(),
  dateTo: z.number().optional(),
});

export type PublicSearchParams = z.infer<typeof PublicSearchParamsSchema>;

export const PublicSearchHitSchema = z.object({
  id: z.string(),
  title: z.string(),
  snippet: z.string(),
  url: z.string().optional(),
  dataset: z.string(),
  category: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  relevance: z.number(),
  documentType: z.string(),
});

export type PublicSearchHit = z.infer<typeof PublicSearchHitSchema>;

export const PublicSearchFacetsSchema = z.object({
  datasets: z.array(z.object({ dataset: z.string(), count: z.number() })),
  categories: z.array(z.object({ category: z.string(), count: z.number() })),
});

export type PublicSearchFacets = z.infer<typeof PublicSearchFacetsSchema>;

export const PublicSearchResultSchema = z.object({
  hits: z.array(PublicSearchHitSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  query: z.string(),
  facets: PublicSearchFacetsSchema,
  timing: z.object({
    searchMs: z.number(),
    totalMs: z.number(),
  }),
});

export type PublicSearchResult = z.infer<typeof PublicSearchResultSchema>;
