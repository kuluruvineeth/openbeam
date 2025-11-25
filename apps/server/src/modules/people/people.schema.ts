/**
 * People/Directory API Schemas
 * Validation schemas for people/directory operations
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
// Person Schemas
// ============================================================================

export const personSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  avatar: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  connectorType: z.string(),
  connectorId: z.string(),
  isBot: z.boolean().optional(),
  documentCount: z.number().optional(),
  lastActiveAt: z.number().optional(),
});

export const personDetailSchema = personSummarySchema.extend({
  bio: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  timezone: z.string().optional(),
  manager: personSummarySchema.optional(),
  directReports: z.array(personSummarySchema).optional(),
  skills: z.array(z.string()).optional(),
  teams: z.array(z.string()).optional(),
  recentActivity: z
    .array(
      z.object({
        type: z.string(),
        title: z.string(),
        documentId: z.string().optional(),
        timestamp: z.number(),
      })
    )
    .optional(),
  activityScore: z.number().optional(),
  connectedAccounts: z
    .array(
      z.object({
        connectorType: z.string(),
        externalId: z.string(),
        email: z.string().optional(),
      })
    )
    .optional(),
});

// ============================================================================
// Query Schemas
// ============================================================================

export const listPeopleQuerySchema = z.object({
  q: z.string().optional().openapi({
    description: "Search query for name, email, or title",
  }),
  department: z.string().optional().openapi({
    description: "Filter by department",
  }),
  connector_type: z.string().optional().openapi({
    description: "Filter by connector type",
  }),
  connector_id: z.string().optional().openapi({
    description: "Filter by connector ID",
  }),
  exclude_bots: z
    .string()
    .optional()
    .transform((v) => v === "true")
    .openapi({
      description: "Exclude bot accounts",
    }),
  limit: z.coerce.number().min(1).max(100).default(20).openapi({
    description: "Maximum number of results",
  }),
  offset: z.coerce.number().min(0).default(0).openapi({
    description: "Pagination offset",
  }),
  sortBy: z
    .enum(["name", "documentCount", "lastActiveAt"])
    .default("name")
    .openapi({
      description: "Field to sort by",
    }),
  sortOrder: z.enum(["asc", "desc"]).default("asc").openapi({
    description: "Sort order",
  }),
});

export const personIdParamsSchema = z.object({
  personId: z.string().openapi({
    param: {
      name: "personId",
      in: "path",
    },
    description: "Person identifier",
  }),
});

export const searchPeopleQuerySchema = z.object({
  q: z.string().min(1).openapi({
    description: "Search query",
    example: "john engineer",
  }),
  limit: z.coerce.number().min(1).max(50).default(10).openapi({
    description: "Maximum number of results",
  }),
});

export const orgChartQuerySchema = z.object({
  depth: z.coerce.number().min(1).max(5).default(2).openapi({
    description: "Depth of org chart to retrieve",
  }),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const listPeopleResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(personSummarySchema),
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

export const getPersonResponseSchema = z.object({
  success: z.literal(true),
  data: personDetailSchema,
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

export const searchPeopleResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    people: z.array(personSummarySchema),
    query: z.string(),
    total: z.number(),
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

export const orgChartResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    person: personSummarySchema,
    manager: personSummarySchema.optional(),
    directReports: z.array(personSummarySchema),
    depth: z.number(),
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

export const personDocumentsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    personId: z.string(),
    person: personSummarySchema.optional(),
    documents: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        documentType: z.string(),
        connectorType: z.string(),
        url: z.string().optional(),
        createdAt: z.number(),
      })
    ),
    total: z.number(),
    documentTypeBreakdown: z.array(
      z.object({
        type: z.string(),
        count: z.number(),
      })
    ),
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

export const personActivityResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    personId: z.string(),
    period: z.string(),
    metrics: z.object({
      documentsCreated: z.number(),
      messagesPosted: z.number(),
      reactionsGiven: z.number(),
      activeChannels: z.number(),
    }),
    activityOverTime: z.array(
      z.object({
        date: z.string(),
        count: z.number(),
      })
    ),
    topChannels: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        messageCount: z.number(),
      })
    ),
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});
