import { z } from "@hono/zod-openapi";
export const errorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

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

export const searchQuerySchema = z.object({
  q: z.string().default("").openapi({
    description: "Search query string",
    example: "project documentation",
  }),
  connector_type: arrayQueryParam.openapi({
    description:
      "Filter by connector types (comma-separated or multiple params)",
    example: "slack,notion",
  }),
  connector_id: z.string().optional().openapi({
    description: "Filter by specific connector ID",
  }),
  document_type: arrayQueryParam.openapi({
    description:
      "Filter by document types (comma-separated: message,file,page,issue,task,comment,email,document,folder,ticket)",
    example: "message,file",
  }),
  source_type: arrayQueryParam.openapi({
    description:
      "Filter by source types (comma-separated: channel,folder,database,repository,board,space)",
    example: "channel,folder",
  }),
  status: arrayQueryParam.openapi({
    description:
      "Filter by status (comma-separated: open,in_progress,done,closed,archived)",
    example: "open,in_progress",
  }),
  priority: arrayQueryParam.openapi({
    description:
      "Filter by priority (comma-separated: critical,high,medium,low,none)",
    example: "high,critical",
  }),
  label: arrayQueryParam.openapi({
    description: "Filter by labels (comma-separated)",
    example: "bug,feature",
  }),
  author_id: z.string().optional().openapi({
    description: "Filter by author ID",
  }),
  source_id: z.string().optional().openapi({
    description: "Filter by source ID (channel, folder, etc.)",
  }),
  from_date: z.coerce.number().optional().openapi({
    description: "Filter documents from this timestamp (Unix epoch ms)",
  }),
  to_date: z.coerce.number().optional().openapi({
    description: "Filter documents until this timestamp (Unix epoch ms)",
  }),
  limit: z.coerce.number().min(1).max(100).default(20).openapi({
    description: "Maximum number of results",
  }),
  offset: z.coerce.number().min(0).default(0).openapi({
    description: "Pagination offset",
  }),
  ranking: z
    .enum(["bm25", "semantic", "hybrid", "recency", "engagement"])
    .default("hybrid")
    .openapi({
      description: "Ranking algorithm to use",
    }),
});

const searchDocumentSchema = z.record(z.string(), z.unknown());

export const searchResponseSchema = z.object({
  documents: z.array(searchDocumentSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  query: z.string(),
  ranking: z.string(),
});

export const autocompleteQuerySchema = z.object({
  q: z.string().min(2).openapi({
    description: "Prefix to autocomplete (minimum 2 characters)",
    example: "proj",
  }),
  limit: z.coerce.number().min(1).max(50).default(10).openapi({
    description: "Maximum number of suggestions",
  }),
});

export const autocompleteResponseSchema = z.object({
  suggestions: z.array(z.string()),
});

export const recentQuerySchema = z.object({
  hours: z.coerce.number().min(1).max(168).default(24).openapi({
    description: "Number of hours to look back (max 7 days)",
  }),
  limit: z.coerce.number().min(1).max(100).default(20).openapi({
    description: "Maximum number of documents",
  }),
});

export const recentResponseSchema = z.object({
  documents: z.array(searchDocumentSchema),
  count: z.number(),
});

export const threadIdParamsSchema = z.object({
  threadId: z.string().openapi({
    param: {
      name: "threadId",
      in: "path",
    },
    description: "Thread identifier",
    example: "1234567890.123456",
  }),
});

export const threadResponseSchema = z.object({
  threadId: z.string(),
  documents: z.array(searchDocumentSchema),
  count: z.number(),
});

export const documentIdParamsSchema = z.object({
  documentId: z.string().openapi({
    param: {
      name: "documentId",
      in: "path",
    },
    description: "Document identifier",
  }),
});

export const similarQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10).openapi({
    description: "Maximum number of similar documents",
  }),
});

export const similarResponseSchema = z.object({
  sourceDocumentId: z.string(),
  similarDocuments: z.array(searchDocumentSchema),
  count: z.number(),
});

export const authorIdParamsSchema = z.object({
  authorId: z.string().openapi({
    param: {
      name: "authorId",
      in: "path",
    },
    description: "Author identifier",
  }),
});

export const authorQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50).openapi({
    description: "Maximum number of documents",
  }),
});

export const authorResponseSchema = z.object({
  authorId: z.string(),
  documents: z.array(searchDocumentSchema),
  count: z.number(),
});

export const mediaSearchQuerySchema = z.object({
  q: z.string().min(1).openapi({
    description: "Search query string",
    example: "product demo presentation",
  }),
  connector_id: z.string().optional().openapi({
    description: "Filter by specific connector ID",
  }),
  source_id: z.string().optional().openapi({
    description: "Filter by source ID",
  }),
  media_type: z
    .enum([
      "meeting",
      "presentation",
      "tutorial",
      "demo",
      "interview",
      "webinar",
      "other",
    ])
    .optional()
    .openapi({
      description: "Filter by media type",
    }),
  from_date: z.coerce.number().optional().openapi({
    description: "Filter media from this timestamp (Unix epoch ms)",
  }),
  to_date: z.coerce.number().optional().openapi({
    description: "Filter media until this timestamp (Unix epoch ms)",
  }),
  limit: z.coerce.number().min(1).max(100).default(20).openapi({
    description: "Maximum number of results",
  }),
  offset: z.coerce.number().min(0).default(0).openapi({
    description: "Pagination offset",
  }),
  ranking: z
    .enum(["bm25", "semantic", "hybrid", "enterprise", "engagement"])
    .default("hybrid")
    .openapi({
      description: "Ranking algorithm to use",
    }),
});

export const mediaSearchResponseSchema = z.object({
  media: z.array(searchDocumentSchema),
  total: z.number(),
  query: z.string(),
  ranking: z.string(),
  queryTime: z.number(),
});

export const unifiedSearchQuerySchema = z.object({
  q: z.string().min(1).openapi({
    description: "Search query string",
    example: "quarterly report",
  }),
  include_documents: z.coerce.boolean().default(true).openapi({
    description: "Include documents in results",
  }),
  include_media: z.coerce.boolean().default(true).openapi({
    description: "Include media in results",
  }),
  connector_type: arrayQueryParam.openapi({
    description: "Filter by connector types",
  }),
  connector_id: z.string().optional().openapi({
    description: "Filter by specific connector ID",
  }),
  document_type: arrayQueryParam.openapi({
    description: "Filter by document types",
  }),
  source_id: z.string().optional().openapi({
    description: "Filter by source ID",
  }),
  from_date: z.coerce.number().optional().openapi({
    description: "Filter from this timestamp",
  }),
  to_date: z.coerce.number().optional().openapi({
    description: "Filter until this timestamp",
  }),
  limit: z.coerce.number().min(1).max(100).default(20).openapi({
    description: "Maximum number of results per type",
  }),
  offset: z.coerce.number().min(0).default(0).openapi({
    description: "Pagination offset",
  }),
  ranking: z
    .enum(["bm25", "semantic", "hybrid", "recency", "engagement"])
    .default("hybrid")
    .openapi({
      description: "Ranking algorithm for documents",
    }),
  media_ranking: z
    .enum(["bm25", "semantic", "hybrid", "enterprise", "engagement"])
    .default("hybrid")
    .openapi({
      description: "Ranking algorithm for media",
    }),
});

export const unifiedSearchResponseSchema = z.object({
  documents: z.array(searchDocumentSchema),
  media: z.array(searchDocumentSchema),
  documentTotal: z.number(),
  mediaTotal: z.number(),
  total: z.number(),
  query: z.string(),
  queryTime: z.number(),
});

export const imageSearchQuerySchema = z.object({
  image_url: z.url().openapi({
    description: "URL of the image to search with",
    example: "https://example.com/image.jpg",
  }),
  index_id: z.string().openapi({
    description: "TwelveLabs index ID to search in",
  }),
  threshold: z
    .enum(["high", "medium", "low", "none"])
    .default("medium")
    .openapi({
      description: "Confidence threshold for results",
    }),
  limit: z.coerce.number().min(1).max(50).default(10).openapi({
    description: "Maximum number of results",
  }),
});

export const imageSearchResponseSchema = z.object({
  results: z.array(
    z.object({
      mediaId: z.string(),
      score: z.number(),
      startSec: z.number(),
      endSec: z.number(),
      confidence: z.string(),
      thumbnailUrl: z.string().optional(),
    })
  ),
  count: z.number(),
});

export const hybridSearchQuerySchema = z.object({
  q: z.string().min(1).openapi({
    description: "Search query string",
    example: "project documentation",
  }),
  mode: z
    .enum(["bm25", "semantic", "hybrid", "hybrid_v2", "enterprise_v2"])
    .default("hybrid_v2")
    .openapi({
      description: "Search mode",
    }),
  rrf_k: z.coerce.number().min(1).max(100).default(60).openapi({
    description: "RRF k parameter",
  }),
  weight_bm25: z.coerce.number().min(0).max(1).default(0.4).openapi({
    description: "BM25 weight in fusion",
  }),
  weight_dense: z.coerce.number().min(0).max(1).default(0.4).openapi({
    description: "Dense embedding weight in fusion",
  }),
  weight_sparse: z.coerce.number().min(0).max(1).default(0.2).openapi({
    description: "Sparse embedding weight in fusion",
  }),
  connector_type: arrayQueryParam.openapi({
    description: "Filter by connector types",
  }),
  document_type: arrayQueryParam.openapi({
    description: "Filter by document types",
  }),
  source_id: arrayQueryParam.openapi({
    description: "Filter by source IDs",
  }),
  from_date: z.coerce.number().optional().openapi({
    description: "Filter from timestamp",
  }),
  to_date: z.coerce.number().optional().openapi({
    description: "Filter until timestamp",
  }),
  limit: z.coerce.number().min(1).max(100).default(20).openapi({
    description: "Maximum results",
  }),
  offset: z.coerce.number().min(0).default(0).openapi({
    description: "Pagination offset",
  }),
});

export const hybridSearchResponseSchema = z.object({
  documents: z.array(
    z.object({
      document: searchDocumentSchema,
      score: z.number(),
      bm25Rank: z.number().optional(),
      denseRank: z.number().optional(),
      sparseRank: z.number().optional(),
      rrfScore: z.number().optional(),
    })
  ),
  total: z.number(),
  timing: z.object({
    embeddingMs: z.number(),
    retrievalMs: z.number(),
    fusionMs: z.number(),
    totalMs: z.number(),
  }),
  metadata: z.object({
    mode: z.string(),
    modelVersion: z.string(),
    rrfK: z.number().optional(),
  }),
});
