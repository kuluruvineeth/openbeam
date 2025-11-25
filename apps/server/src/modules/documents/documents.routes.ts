/**
 * Documents API Routes
 * OpenAPI route definitions for document operations
 */

import { createRoute } from "@hono/zod-openapi";
import {
  bulkOperationBodySchema,
  bulkOperationResponseSchema,
  bulkUpdateBodySchema,
  createDocumentBodySchema,
  createDocumentResponseSchema,
  deleteDocumentResponseSchema,
  documentIdParamsSchema,
  errorResponseSchema,
  getDocumentQuerySchema,
  getDocumentResponseSchema,
  listDocumentsQuerySchema,
  listDocumentsResponseSchema,
  updateDocumentBodySchema,
  updateDocumentResponseSchema,
} from "./documents.schema";

const tags = ["Documents"];

// ============================================================================
// List Documents
// ============================================================================

export const listDocuments = createRoute({
  tags,
  method: "get",
  path: "/",
  summary: "List documents",
  description:
    "Retrieve a paginated list of indexed documents with optional filtering and sorting",
  request: {
    query: listDocumentsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: listDocumentsResponseSchema,
        },
      },
      description: "Documents retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Bad Request",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Unauthorized",
    },
  },
});

// ============================================================================
// Get Document
// ============================================================================

export const getDocument = createRoute({
  tags,
  method: "get",
  path: "/{id}",
  summary: "Get document",
  description: "Retrieve a specific document by ID with full content",
  request: {
    params: documentIdParamsSchema,
    query: getDocumentQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: getDocumentResponseSchema,
        },
      },
      description: "Document retrieved successfully",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Document not found",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Unauthorized",
    },
    403: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Forbidden - insufficient permissions",
    },
  },
});

// ============================================================================
// Create Document
// ============================================================================

export const createDocument = createRoute({
  tags,
  method: "post",
  path: "/",
  summary: "Create document",
  description:
    "Index a new document manually. For connector synced documents, use the sync APIs.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createDocumentBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: createDocumentResponseSchema,
        },
      },
      description: "Document created successfully",
    },
    400: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Bad Request",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Unauthorized",
    },
    403: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Forbidden",
    },
  },
});

// ============================================================================
// Update Document
// ============================================================================

export const updateDocument = createRoute({
  tags,
  method: "patch",
  path: "/{id}",
  summary: "Update document",
  description: "Update document metadata. Content updates require re-indexing.",
  request: {
    params: documentIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: updateDocumentBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: updateDocumentResponseSchema,
        },
      },
      description: "Document updated successfully",
    },
    400: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Bad Request",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Document not found",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Unauthorized",
    },
    403: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Forbidden",
    },
  },
});

// ============================================================================
// Delete Document
// ============================================================================

export const deleteDocument = createRoute({
  tags,
  method: "delete",
  path: "/{id}",
  summary: "Delete document",
  description: "Remove a document from the index",
  request: {
    params: documentIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: deleteDocumentResponseSchema,
        },
      },
      description: "Document deleted successfully",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Document not found",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Unauthorized",
    },
    403: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Forbidden",
    },
  },
});

// ============================================================================
// Bulk Delete
// ============================================================================

export const bulkDelete = createRoute({
  tags,
  method: "post",
  path: "/bulk-delete",
  summary: "Bulk delete documents",
  description: "Delete multiple documents at once (max 100)",
  request: {
    body: {
      content: {
        "application/json": {
          schema: bulkOperationBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: bulkOperationResponseSchema,
        },
      },
      description: "Bulk delete completed",
    },
    400: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Bad Request",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Unauthorized",
    },
    403: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Forbidden",
    },
  },
});

// ============================================================================
// Bulk Update
// ============================================================================

export const bulkUpdate = createRoute({
  tags,
  method: "post",
  path: "/bulk-update",
  summary: "Bulk update documents",
  description: "Update multiple documents at once (max 100)",
  request: {
    body: {
      content: {
        "application/json": {
          schema: bulkUpdateBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: bulkOperationResponseSchema,
        },
      },
      description: "Bulk update completed",
    },
    400: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Bad Request",
    },
    401: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Unauthorized",
    },
    403: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Forbidden",
    },
  },
});
