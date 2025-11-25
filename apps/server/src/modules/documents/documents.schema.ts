/**
 * Documents API Schemas
 * Validation schemas for document operations
 */

import { z } from "zod";
import {
  commaSeparatedArraySchema,
  dateRangeQuerySchema,
  errorResponseSchema,
  idParamSchema,
  limitOffsetQuerySchema,
  tagsSchema,
} from "@/lib/validation";

// ============================================================================
// Parameter Schemas
// ============================================================================

export const documentIdParamsSchema = idParamSchema;

export const connectorIdParamsSchema = z.object({
  connectorId: z
    .string()
    .min(1)
    .openapi({
      param: {
        name: "connectorId",
        in: "path",
      },
      description: "Connector identifier",
    }),
});

// ============================================================================
// Query Schemas
// ============================================================================

export const listDocumentsQuerySchema = limitOffsetQuerySchema
  .merge(dateRangeQuerySchema)
  .extend({
    connectorId: z.string().optional().openapi({
      description: "Filter by connector ID",
    }),
    connectorType: z.string().optional().openapi({
      description: "Filter by connector type (e.g., SLACK, NOTION)",
      example: "SLACK",
    }),
    documentType: z.string().optional().openapi({
      description: "Filter by document type",
      example: "message",
    }),
    authorId: z.string().optional().openapi({
      description: "Filter by author ID",
    }),
    sourceId: z.string().optional().openapi({
      description: "Filter by source ID (channel, folder, etc.)",
    }),
    tags: commaSeparatedArraySchema.openapi({
      description: "Filter by tags (comma-separated)",
    }),
    sortBy: z
      .enum(["createdAt", "updatedAt", "title"])
      .default("createdAt")
      .openapi({
        description: "Field to sort by",
      }),
    sortOrder: z.enum(["asc", "desc"]).default("desc").openapi({
      description: "Sort order",
    }),
  });

export const getDocumentQuerySchema = z.object({
  includeContent: z
    .string()
    .optional()
    .transform((v) => v === "true")
    .openapi({
      description: "Include full content in response",
    }),
  includeRelated: z
    .string()
    .optional()
    .transform((v) => v === "true")
    .openapi({
      description: "Include related documents",
    }),
});

// ============================================================================
// Body Schemas
// ============================================================================

export const createDocumentBodySchema = z.object({
  title: z.string().min(1).max(500).openapi({
    description: "Document title",
    example: "Project Overview",
  }),
  content: z.string().min(1).openapi({
    description: "Document content",
    example: "This is the project overview...",
  }),
  contentType: z.enum(["text", "markdown", "html"]).default("text").openapi({
    description: "Content format",
  }),
  documentType: z.string().default("document").openapi({
    description: "Document type",
    example: "document",
  }),
  url: z.string().url().optional().openapi({
    description: "Source URL",
  }),
  sourceId: z.string().optional().openapi({
    description: "Source identifier (channel, folder, etc.)",
  }),
  authorId: z.string().optional().openapi({
    description: "Author identifier",
  }),
  authorName: z.string().optional().openapi({
    description: "Author display name",
  }),
  tags: tagsSchema.openapi({
    description: "Document tags",
  }),
  metadata: z.record(z.unknown()).optional().openapi({
    description: "Additional metadata",
  }),
  isPublic: z.boolean().default(false).openapi({
    description: "Whether the document is publicly accessible",
  }),
  accessControl: z.array(z.string()).default([]).openapi({
    description: "List of user/group IDs that can access this document",
  }),
});

export const updateDocumentBodySchema = z.object({
  title: z.string().min(1).max(500).optional().openapi({
    description: "Document title",
  }),
  content: z.string().optional().openapi({
    description: "Document content",
  }),
  contentType: z.enum(["text", "markdown", "html"]).optional().openapi({
    description: "Content format",
  }),
  tags: tagsSchema.optional().openapi({
    description: "Document tags",
  }),
  metadata: z.record(z.unknown()).optional().openapi({
    description: "Additional metadata",
  }),
  isPublic: z.boolean().optional().openapi({
    description: "Whether the document is publicly accessible",
  }),
  accessControl: z.array(z.string()).optional().openapi({
    description: "List of user/group IDs that can access this document",
  }),
});

export const bulkOperationBodySchema = z.object({
  documentIds: z.array(z.string()).min(1).max(100).openapi({
    description: "List of document IDs to operate on (max 100)",
  }),
});

export const bulkUpdateBodySchema = z.object({
  documentIds: z.array(z.string()).min(1).max(100).openapi({
    description: "List of document IDs to update",
  }),
  updates: z
    .object({
      tags: tagsSchema.optional(),
      isPublic: z.boolean().optional(),
      accessControl: z.array(z.string()).optional(),
      metadata: z.record(z.unknown()).optional(),
    })
    .openapi({
      description: "Updates to apply to all documents",
    }),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const documentSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  documentType: z.string(),
  connectorType: z.string(),
  connectorId: z.string(),
  url: z.string().optional(),
  thumbnail: z.string().optional(),
  snippet: z.string().optional(),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
  authorAvatar: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
  accessControl: z.array(z.string()),
  isPublic: z.boolean(),
  relevanceScore: z.number().optional(),
});

export const documentDetailSchema = documentSummarySchema.extend({
  content: z.string(),
  contentType: z.string(),
  rawContent: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        size: z.number(),
        url: z.string().optional(),
      })
    )
    .optional(),
  reactions: z
    .array(
      z.object({
        emoji: z.string(),
        count: z.number(),
        users: z.array(z.string()).optional(),
      })
    )
    .optional(),
  threadId: z.string().optional(),
  parentId: z.string().optional(),
  relatedDocuments: z.array(documentSummarySchema).optional(),
});

export const listDocumentsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(documentSummarySchema),
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

export const getDocumentResponseSchema = z.object({
  success: z.literal(true),
  data: documentDetailSchema,
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

export const createDocumentResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    message: z.string(),
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

export const updateDocumentResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    message: z.string(),
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

export const deleteDocumentResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    message: z.string(),
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

export const bulkOperationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    succeeded: z.number(),
    failed: z.number(),
    errors: z
      .array(
        z.object({
          documentId: z.string(),
          error: z.string(),
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

// Export error schema
export { errorResponseSchema };
