/**
 * Validation Utilities - Common validators and schema helpers
 */

import { z } from "zod";

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * Standard ID parameter (CUID format)
 */
export const idParamSchema = z.object({
  id: z
    .string()
    .min(1)
    .openapi({
      param: {
        name: "id",
        in: "path",
      },
      description: "Resource identifier",
      example: "clxyz123456789",
    }),
});

/**
 * Standard pagination query parameters
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1).openapi({
    description: "Page number (1-indexed)",
    example: 1,
  }),
  pageSize: z.coerce.number().min(1).max(100).default(20).openapi({
    description: "Number of items per page (max 100)",
    example: 20,
  }),
});

/**
 * Legacy limit/offset pagination
 */
export const limitOffsetQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20).openapi({
    description: "Maximum number of items to return",
    example: 20,
  }),
  offset: z.coerce.number().min(0).default(0).openapi({
    description: "Number of items to skip",
    example: 0,
  }),
});

/**
 * Standard sorting parameters
 */
export const sortQuerySchema = z.object({
  sortBy: z.string().optional().openapi({
    description: "Field to sort by",
    example: "createdAt",
  }),
  sortOrder: z.enum(["asc", "desc"]).default("desc").openapi({
    description: "Sort order",
    example: "desc",
  }),
});

/**
 * Date range parameters (Unix timestamps)
 */
export const dateRangeQuerySchema = z.object({
  fromDate: z.coerce.number().optional().openapi({
    description: "Filter from this timestamp (Unix epoch milliseconds)",
    example: 1_700_000_000_000,
  }),
  toDate: z.coerce.number().optional().openapi({
    description: "Filter until this timestamp (Unix epoch milliseconds)",
    example: 1_700_100_000_000,
  }),
});

/**
 * Standard error response schema
 */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    requestId: z.string().optional(),
  }),
});

// ============================================================================
// Common Field Schemas
// ============================================================================

export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(255, "Name must be 255 characters or less");

export const descriptionSchema = z
  .string()
  .max(2000, "Description must be 2000 characters or less")
  .optional();

export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase alphanumeric with hyphens"
  );

export const emailSchema = z.string().email("Invalid email address");

export const urlSchema = z.string().url("Invalid URL").optional();

export const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
  .optional();

export const tagsSchema = z
  .array(z.string().max(50))
  .max(20, "Maximum 20 tags allowed")
  .default([]);

// ============================================================================
// Connector-related Schemas
// ============================================================================

export const connectorTypeSchema = z
  .enum([
    "SLACK",
    "GOOGLE_DRIVE",
    "NOTION",
    "GITHUB",
    "JIRA",
    "CONFLUENCE",
    "MICROSOFT_TEAMS",
    "ONEDRIVE",
    "SHAREPOINT",
    "GMAIL",
    "OUTLOOK",
    "DROPBOX",
    "ASANA",
    "LINEAR",
    "ZENDESK",
    "INTERCOM",
    "SALESFORCE",
    "HUBSPOT",
  ])
  .optional();

export const documentTypeSchema = z
  .enum([
    "message",
    "file",
    "page",
    "issue",
    "email",
    "document",
    "thread",
    "comment",
    "task",
    "ticket",
  ])
  .optional();

// ============================================================================
// Visibility Schemas
// ============================================================================

export const visibilitySchema = z.enum(["private", "team", "public"]);

// ============================================================================
// API Key Schemas
// ============================================================================

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
  "admin:read",
  "admin:write",
  "admin:*",
]);

export const apiKeyTypeSchema = z.enum([
  "standard",
  "restricted",
  "admin",
  "service",
  "webhook",
  "embed",
]);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a schema for arrays with configurable min/max
 */
export function arraySchema<T extends z.ZodTypeAny>(
  itemSchema: T,
  options?: { min?: number; max?: number }
) {
  let schema = z.array(itemSchema);

  if (options?.min !== undefined) {
    schema = schema.min(options.min) as typeof schema;
  }

  if (options?.max !== undefined) {
    schema = schema.max(options.max) as typeof schema;
  }

  return schema;
}

/**
 * Create an optional string array query param (comma-separated)
 */
export const commaSeparatedArraySchema = z
  .string()
  .optional()
  .transform((val) => (val ? val.split(",").map((s) => s.trim()) : undefined));

/**
 * Create a boolean query param
 */
export const booleanQuerySchema = z
  .string()
  .optional()
  .transform((val) => {
    if (val === undefined) {
      return;
    }
    return val === "true" || val === "1";
  });

/**
 * Sanitize string input
 */
export function sanitize(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML
    .slice(0, 10_000); // Limit length
}

/**
 * Generate a URL-safe slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}
