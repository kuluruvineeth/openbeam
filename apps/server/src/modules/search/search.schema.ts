/**
 * Enhanced Search API Schemas
 * Comprehensive search with facets, aggregations, and advanced filtering
 */

import { z } from "zod";

// ============================================================================
// Shared Schemas
// ============================================================================

export const errorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    requestId: z.string().optional(),
  }),
});

// ============================================================================
// Main Search Schemas
// ============================================================================

export const searchQuerySchema = z.object({
  q: z.string().default("").openapi({
    description: "Search query string. Supports natural language queries.",
    example: "project documentation kubernetes",
  }),

  // Filtering
  connector_types: z.string().optional().openapi({
    description: "Filter by connector types (comma-separated)",
    example: "SLACK,NOTION",
  }),
  connector_ids: z.string().optional().openapi({
    description: "Filter by connector IDs (comma-separated)",
  }),
  document_types: z.string().optional().openapi({
    description: "Filter by document types (comma-separated)",
    example: "message,file,page",
  }),
  author_ids: z.string().optional().openapi({
    description: "Filter by author IDs (comma-separated)",
  }),
  source_ids: z.string().optional().openapi({
    description: "Filter by source IDs (comma-separated)",
  }),
  tags: z.string().optional().openapi({
    description: "Filter by tags (comma-separated)",
  }),

  // Date range
  from_date: z.coerce.number().optional().openapi({
    description: "Filter documents from this timestamp (Unix epoch ms)",
  }),
  to_date: z.coerce.number().optional().openapi({
    description: "Filter documents until this timestamp (Unix epoch ms)",
  }),

  // Pagination
  limit: z.coerce.number().min(1).max(100).default(20).openapi({
    description: "Maximum number of results (max 100)",
  }),
  offset: z.coerce.number().min(0).default(0).openapi({
    description: "Pagination offset",
  }),

  // Ranking
  ranking: z
    .enum(["bm25", "semantic", "hybrid", "recency", "engagement"])
    .default("hybrid")
    .openapi({
      description: "Ranking algorithm to use",
    }),

  // Options
  include_snippets: z
    .string()
    .optional()
    .transform((v) => v === "true")
    .openapi({
      description: "Include highlighted snippets in results",
    }),
  snippet_length: z.coerce.number().min(50).max(500).default(200).openapi({
    description: "Maximum snippet length",
  }),
  include_facets: z
    .string()
    .optional()
    .transform((v) => v === "true")
    .openapi({
      description: "Include faceted counts in response",
    }),
  include_aggregations: z
    .string()
    .optional()
    .transform((v) => v === "true")
    .openapi({
      description: "Include aggregations in response",
    }),
  group_by_thread: z
    .string()
    .optional()
    .transform((v) => v === "true")
    .openapi({
      description: "Group messages by thread",
    }),
});

export const documentSchema = z.object({
  id: z.string(),
  title: z.string(),
  documentType: z.string(),
  connectorType: z.string(),
  connectorId: z.string(),
  url: z.string().optional(),
  thumbnail: z.string().optional(),
  snippet: z.string().optional(),
  highlightedSnippet: z.string().optional(),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
  authorAvatar: z.string().optional(),
  sourceId: z.string().optional(),
  sourceName: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
  relevanceScore: z.number().optional(),
  threadId: z.string().optional(),
  replyCount: z.number().optional(),
});

export const facetValueSchema = z.object({
  value: z.string(),
  label: z.string().optional(),
  count: z.number(),
});

export const dateFacetSchema = z.object({
  period: z.string(),
  count: z.number(),
  from: z.number(),
  to: z.number(),
});

export const searchFacetsSchema = z.object({
  connectorTypes: z.array(facetValueSchema),
  documentTypes: z.array(facetValueSchema),
  authors: z.array(facetValueSchema),
  sources: z.array(facetValueSchema),
  dates: z.array(dateFacetSchema),
});

export const searchAggregationsSchema = z.object({
  totalDocuments: z.number(),
  avgRelevanceScore: z.number(),
  topAuthors: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      count: z.number(),
    })
  ),
  topSources: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      count: z.number(),
    })
  ),
  activityOverTime: z.array(
    z.object({
      date: z.string(),
      count: z.number(),
    })
  ),
});

export const searchResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    documents: z.array(documentSchema),
    total: z.number(),
    query: z.string(),
    ranking: z.string(),
    facets: searchFacetsSchema.optional(),
    aggregations: searchAggregationsSchema.optional(),
    suggestions: z.array(z.string()).optional(),
    queryTime: z.number(),
  }),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

// ============================================================================
// Autocomplete Schemas
// ============================================================================

export const autocompleteQuerySchema = z.object({
  q: z.string().min(1).openapi({
    description: "Prefix to autocomplete (minimum 1 character)",
    example: "proj",
  }),
  limit: z.coerce.number().min(1).max(20).default(10).openapi({
    description: "Maximum number of suggestions",
  }),
  types: z.string().optional().openapi({
    description:
      "Suggestion types to include (comma-separated: query,document,person,action)",
  }),
});

export const suggestionSchema = z.object({
  text: z.string(),
  type: z.enum(["query", "document", "person", "action"]),
  entityId: z.string().optional(),
  icon: z.string().optional(),
  url: z.string().optional(),
  score: z.number().optional(),
});

export const autocompleteResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    suggestions: z.array(suggestionSchema),
    query: z.string(),
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

// ============================================================================
// Recent Documents Schemas
// ============================================================================

export const recentQuerySchema = z.object({
  hours: z.coerce.number().min(1).max(168).default(24).openapi({
    description: "Number of hours to look back (max 7 days)",
  }),
  limit: z.coerce.number().min(1).max(100).default(20).openapi({
    description: "Maximum number of documents",
  }),
  connector_types: z.string().optional().openapi({
    description: "Filter by connector types (comma-separated)",
  }),
  document_types: z.string().optional().openapi({
    description: "Filter by document types (comma-separated)",
  }),
});

export const recentResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    documents: z.array(documentSchema),
    count: z.number(),
    hours: z.number(),
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

// ============================================================================
// Thread Search Schemas
// ============================================================================

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
  success: z.literal(true),
  data: z.object({
    threadId: z.string(),
    documents: z.array(documentSchema),
    count: z.number(),
    participants: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          avatar: z.string().optional(),
        })
      )
      .optional(),
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

// ============================================================================
// Similar Documents Schemas
// ============================================================================

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
  min_score: z.coerce.number().min(0).max(1).optional().openapi({
    description: "Minimum similarity score (0-1)",
  }),
});

export const similarResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    sourceDocumentId: z.string(),
    sourceDocument: documentSchema.optional(),
    similarDocuments: z.array(
      documentSchema.extend({
        similarityScore: z.number(),
      })
    ),
    count: z.number(),
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

// ============================================================================
// Author Search Schemas
// ============================================================================

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
  document_types: z.string().optional().openapi({
    description: "Filter by document types (comma-separated)",
  }),
  from_date: z.coerce.number().optional().openapi({
    description: "Filter documents from this timestamp",
  }),
  to_date: z.coerce.number().optional().openapi({
    description: "Filter documents until this timestamp",
  }),
});

export const authorResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    authorId: z.string(),
    author: z
      .object({
        id: z.string(),
        name: z.string(),
        email: z.string().optional(),
        avatar: z.string().optional(),
        title: z.string().optional(),
      })
      .optional(),
    documents: z.array(documentSchema),
    count: z.number(),
    documentTypeBreakdown: z
      .array(
        z.object({
          type: z.string(),
          count: z.number(),
        })
      )
      .optional(),
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

// ============================================================================
// Answer/AI Search Schemas
// ============================================================================

export const answerQuerySchema = z.object({
  q: z.string().min(3).openapi({
    description: "Question to answer",
    example: "What is the deployment process for the backend service?",
  }),
  max_sources: z.coerce.number().min(1).max(10).default(5).openapi({
    description: "Maximum number of source documents to use",
  }),
  include_citations: z
    .string()
    .optional()
    .transform((v) => v !== "false")
    .openapi({
      description: "Include citations in the answer",
    }),
});

export const answerResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    question: z.string(),
    answer: z.string(),
    confidence: z.number(),
    citations: z.array(
      z.object({
        documentId: z.string(),
        title: z.string(),
        url: z.string().optional(),
        snippet: z.string(),
        relevanceScore: z.number(),
      })
    ),
    relatedQuestions: z.array(z.string()).optional(),
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});
