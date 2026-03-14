import { z } from "@hono/zod-openapi";

const arrayQueryParam = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((val) => {
    if (!val) {
      return;
    }
    if (Array.isArray(val)) {
      return val.filter(Boolean);
    }
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  });

export const publicSearchQuerySchema = z.object({
  q: z.string().min(1).max(500).openapi({
    description: "Search query",
    example: "CVE-2024-1234",
  }),
  dataset: arrayQueryParam.openapi({
    description:
      "Filter by dataset (comma-separated: NVD,MITRE_ATTACK,CISA_KEV,OWASP)",
    example: "NVD,MITRE_ATTACK",
  }),
  category: z
    .enum([
      "security",
      "government",
      "academic",
      "community",
      "legal",
      "health",
      "financial",
      "standards",
    ])
    .optional()
    .openapi({ description: "Filter by dataset category" }),
  document_type: arrayQueryParam.openapi({
    description: "Filter by document type",
  }),
  from_date: z.coerce.number().optional().openapi({
    description: "Filter from timestamp (Unix epoch ms)",
  }),
  to_date: z.coerce.number().optional().openapi({
    description: "Filter until timestamp (Unix epoch ms)",
  }),
  limit: z.coerce.number().min(1).max(50).default(20).openapi({
    description: "Max results (capped at 50)",
  }),
  offset: z.coerce.number().min(0).max(1000).default(0).openapi({
    description: "Pagination offset (max 1000)",
  }),
});

export const publicSearchHitSchema = z.object({
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

export const publicSearchResponseSchema = z.object({
  hits: z.array(publicSearchHitSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  query: z.string(),
  facets: z.object({
    datasets: z.array(z.object({ dataset: z.string(), count: z.number() })),
    categories: z.array(z.object({ category: z.string(), count: z.number() })),
  }),
  timing: z.object({
    searchMs: z.number(),
    totalMs: z.number(),
  }),
});

export const publicSearchErrorSchema = z.object({
  error: z.string(),
  retryAfter: z.number().optional(),
});

export const publicDatasetsResponseSchema = z.object({
  datasets: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      category: z.string(),
      estimatedDocuments: z.number(),
    })
  ),
});
