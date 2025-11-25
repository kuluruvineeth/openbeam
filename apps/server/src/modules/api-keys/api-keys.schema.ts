/**
 * API Keys Management Schemas
 * Validation schemas for API key operations
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
// API Key Schemas
// ============================================================================

export const apiKeyTypeSchema = z.enum([
  "standard",
  "restricted",
  "admin",
  "service",
  "webhook",
  "embed",
]);

export const apiKeyScopeSchema = z.enum([
  "search:read",
  "search:write",
  "documents:read",
  "documents:write",
  "documents:delete",
  "people:read",
  "connectors:read",
  "connectors:write",
  "connectors:sync",
  "connectors:delete",
  "collections:read",
  "collections:write",
  "collections:delete",
  "bookmarks:read",
  "bookmarks:write",
  "chat:read",
  "chat:write",
  "assistants:read",
  "assistants:write",
  "assistants:delete",
  "analytics:read",
  "api_keys:read",
  "api_keys:write",
  "api_keys:delete",
  "team:read",
  "team:write",
  "users:read",
  "users:write",
  "admin:*",
]);

export const apiKeySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  type: apiKeyTypeSchema,
  scopes: z.array(z.string()),
  isActive: z.boolean(),
  createdAt: z.string(),
  expiresAt: z.string().optional(),
  lastUsedAt: z.string().optional(),
  usageCount: z.number(),
});

export const apiKeyDetailSchema = apiKeySummarySchema.extend({
  description: z.string().optional(),
  allowedIps: z.array(z.string()),
  allowedDomains: z.array(z.string()),
  rateLimit: z.object({
    requestsPerMinute: z.number().optional(),
    requestsPerHour: z.number().optional(),
    requestsPerDay: z.number().optional(),
  }),
  createdBy: z.string(),
});

// ============================================================================
// Query Schemas
// ============================================================================

export const listApiKeysQuerySchema = z.object({
  type: apiKeyTypeSchema.optional().openapi({
    description: "Filter by key type",
  }),
  active_only: z
    .string()
    .optional()
    .transform((v) => v === "true")
    .openapi({
      description: "Only return active keys",
    }),
  limit: z.coerce.number().min(1).max(100).default(50).openapi({
    description: "Maximum number of keys",
  }),
  offset: z.coerce.number().min(0).default(0).openapi({
    description: "Pagination offset",
  }),
});

export const apiKeyIdParamsSchema = z.object({
  keyId: z.string().openapi({
    param: {
      name: "keyId",
      in: "path",
    },
    description: "API key identifier",
  }),
});

// ============================================================================
// Body Schemas
// ============================================================================

export const createApiKeyBodySchema = z.object({
  name: z.string().min(1).max(100).openapi({
    description: "Human-readable name for the API key",
    example: "Production Integration",
  }),
  description: z.string().max(500).optional().openapi({
    description: "Description of the key's purpose",
  }),
  type: apiKeyTypeSchema.default("standard").openapi({
    description: "API key type",
  }),
  scopes: z
    .array(apiKeyScopeSchema)
    .min(1)
    .openapi({
      description: "Permission scopes for the key",
      example: ["search:read", "documents:read"],
    }),
  expiresIn: z.number().min(1).max(365).optional().openapi({
    description: "Expiration in days (optional, max 365)",
  }),
  allowedIps: z.array(z.string().ip()).default([]).openapi({
    description: "IP addresses allowed to use this key (empty = all)",
  }),
  allowedDomains: z.array(z.string()).default([]).openapi({
    description: "Domains allowed to use this key (for embed keys)",
  }),
  rateLimit: z
    .object({
      requestsPerMinute: z.number().min(1).max(10_000).optional(),
      requestsPerHour: z.number().min(1).max(100_000).optional(),
      requestsPerDay: z.number().min(1).max(1_000_000).optional(),
    })
    .default({})
    .openapi({
      description: "Rate limiting configuration",
    }),
});

export const updateApiKeyBodySchema = z.object({
  name: z.string().min(1).max(100).optional().openapi({
    description: "Human-readable name for the API key",
  }),
  description: z.string().max(500).optional().openapi({
    description: "Description of the key's purpose",
  }),
  scopes: z.array(apiKeyScopeSchema).min(1).optional().openapi({
    description: "Permission scopes for the key",
  }),
  allowedIps: z.array(z.string().ip()).optional().openapi({
    description: "IP addresses allowed to use this key",
  }),
  allowedDomains: z.array(z.string()).optional().openapi({
    description: "Domains allowed to use this key",
  }),
  rateLimit: z
    .object({
      requestsPerMinute: z.number().min(1).max(10_000).optional(),
      requestsPerHour: z.number().min(1).max(100_000).optional(),
      requestsPerDay: z.number().min(1).max(1_000_000).optional(),
    })
    .optional()
    .openapi({
      description: "Rate limiting configuration",
    }),
});

export const revokeApiKeyBodySchema = z.object({
  reason: z.string().max(500).optional().openapi({
    description: "Reason for revoking the key",
  }),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const listApiKeysResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(apiKeySummarySchema),
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

export const apiKeyResponseSchema = z.object({
  success: z.literal(true),
  data: apiKeyDetailSchema,
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

export const createApiKeyResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    key: z.string(), // Full key (only shown once)
    prefix: z.string(),
    name: z.string(),
    type: apiKeyTypeSchema,
    scopes: z.array(z.string()),
    expiresAt: z.string().optional(),
    createdAt: z.string(),
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

export const deleteResponseSchema = z.object({
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

export const apiKeyUsageResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    keyId: z.string(),
    period: z.string(),
    totalRequests: z.number(),
    successfulRequests: z.number(),
    failedRequests: z.number(),
    avgResponseTimeMs: z.number(),
    requestsByEndpoint: z.array(
      z.object({
        endpoint: z.string(),
        count: z.number(),
      })
    ),
    requestsOverTime: z.array(
      z.object({
        timestamp: z.string(),
        count: z.number(),
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
