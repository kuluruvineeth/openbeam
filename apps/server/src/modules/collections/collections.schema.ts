/**
 * Collections & Bookmarks API Schemas
 * Validation schemas for collections and bookmark operations
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
// Collection Schemas
// ============================================================================

export const collectionItemSchema = z.object({
  id: z.string(),
  type: z.enum(["document", "search", "link", "note"]),
  documentId: z.string().optional(),
  url: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  order: z.number(),
  addedAt: z.string(),
  addedBy: z.string(),
});

export const collectionSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  visibility: z.enum(["private", "team", "public"]),
  itemCount: z.number(),
  isPinned: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const collectionDetailSchema = collectionSummarySchema.extend({
  items: z.array(collectionItemSchema),
  coverImage: z.string().optional(),
  collaborators: z.array(z.string()).optional(),
  isSmartCollection: z.boolean(),
  smartRules: z.record(z.unknown()).optional(),
});

// ============================================================================
// Bookmark Schemas
// ============================================================================

export const bookmarkSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  documentType: z.string(),
  title: z.string().optional(),
  url: z.string().optional(),
  thumbnail: z.string().optional(),
  folder: z.string().optional(),
  tags: z.array(z.string()),
  notes: z.string().optional(),
  accessCount: z.number(),
  lastAccessedAt: z.string().optional(),
  createdAt: z.string(),
});

// ============================================================================
// Query Schemas
// ============================================================================

export const listCollectionsQuerySchema = z.object({
  visibility: z.enum(["private", "team", "public"]).optional().openapi({
    description: "Filter by visibility",
  }),
  pinned_only: z
    .string()
    .optional()
    .transform((v) => v === "true")
    .openapi({
      description: "Only return pinned collections",
    }),
  limit: z.coerce.number().min(1).max(50).default(20).openapi({
    description: "Maximum number of collections",
  }),
  offset: z.coerce.number().min(0).default(0).openapi({
    description: "Pagination offset",
  }),
});

export const collectionIdParamsSchema = z.object({
  collectionId: z.string().openapi({
    param: {
      name: "collectionId",
      in: "path",
    },
    description: "Collection identifier",
  }),
});

export const listBookmarksQuerySchema = z.object({
  folder: z.string().optional().openapi({
    description: "Filter by folder",
  }),
  tags: z.string().optional().openapi({
    description: "Filter by tags (comma-separated)",
  }),
  document_type: z.string().optional().openapi({
    description: "Filter by document type",
  }),
  limit: z.coerce.number().min(1).max(100).default(50).openapi({
    description: "Maximum number of bookmarks",
  }),
  offset: z.coerce.number().min(0).default(0).openapi({
    description: "Pagination offset",
  }),
});

export const bookmarkIdParamsSchema = z.object({
  bookmarkId: z.string().openapi({
    param: {
      name: "bookmarkId",
      in: "path",
    },
    description: "Bookmark identifier",
  }),
});

// ============================================================================
// Body Schemas
// ============================================================================

export const createCollectionBodySchema = z.object({
  name: z.string().min(1).max(100).openapi({
    description: "Collection name",
    example: "Project Resources",
  }),
  description: z.string().max(500).optional().openapi({
    description: "Collection description",
  }),
  icon: z.string().optional().openapi({
    description: "Icon identifier or emoji",
  }),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .openapi({
      description: "Hex color code",
    }),
  visibility: z.enum(["private", "team", "public"]).default("private").openapi({
    description: "Collection visibility",
  }),
  isSmartCollection: z.boolean().default(false).openapi({
    description: "Whether this is a smart collection",
  }),
  smartRules: z.record(z.unknown()).optional().openapi({
    description: "Rules for smart collection auto-population",
  }),
});

export const updateCollectionBodySchema = createCollectionBodySchema.partial();

export const addItemBodySchema = z.object({
  type: z.enum(["document", "search", "link", "note"]).openapi({
    description: "Item type",
  }),
  documentId: z.string().optional().openapi({
    description: "Document ID (for document type)",
  }),
  url: z.string().url().optional().openapi({
    description: "URL (for link type)",
  }),
  title: z.string().optional().openapi({
    description: "Item title",
  }),
  description: z.string().optional().openapi({
    description: "Item description",
  }),
  notes: z.string().optional().openapi({
    description: "User notes",
  }),
});

export const reorderItemsBodySchema = z.object({
  itemIds: z.array(z.string()).openapi({
    description: "Item IDs in desired order",
  }),
});

export const createBookmarkBodySchema = z.object({
  documentId: z.string().openapi({
    description: "Document ID to bookmark",
  }),
  folder: z.string().optional().openapi({
    description: "Folder to organize bookmark",
  }),
  tags: z.array(z.string()).default([]).openapi({
    description: "Tags for the bookmark",
  }),
  notes: z.string().optional().openapi({
    description: "User notes",
  }),
});

export const updateBookmarkBodySchema = z.object({
  folder: z.string().optional().openapi({
    description: "Folder to organize bookmark",
  }),
  tags: z.array(z.string()).optional().openapi({
    description: "Tags for the bookmark",
  }),
  notes: z.string().optional().openapi({
    description: "User notes",
  }),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const listCollectionsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(collectionSummarySchema),
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

export const collectionResponseSchema = z.object({
  success: z.literal(true),
  data: collectionDetailSchema,
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
      processingTimeMs: z.number(),
    })
    .optional(),
});

export const listBookmarksResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(bookmarkSchema),
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

export const bookmarkResponseSchema = z.object({
  success: z.literal(true),
  data: bookmarkSchema,
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

export const foldersResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    folders: z.array(
      z.object({
        name: z.string(),
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
