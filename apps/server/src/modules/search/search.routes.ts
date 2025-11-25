/**
 * Enhanced Search API Routes
 * OpenAPI route definitions for search operations
 */

import { createRoute } from "@hono/zod-openapi";
import {
  answerQuerySchema,
  answerResponseSchema,
  authorIdParamsSchema,
  authorQuerySchema,
  authorResponseSchema,
  autocompleteQuerySchema,
  autocompleteResponseSchema,
  documentIdParamsSchema,
  errorSchema,
  recentQuerySchema,
  recentResponseSchema,
  searchQuerySchema,
  searchResponseSchema,
  similarQuerySchema,
  similarResponseSchema,
  threadIdParamsSchema,
  threadResponseSchema,
} from "./search.schema";

const tags = ["Search"];

// ============================================================================
// Main Search
// ============================================================================

export const mainSearch = createRoute({
  tags,
  method: "get",
  path: "/",
  summary: "Search documents",
  description: `
Search across all indexed documents with powerful filtering, ranking, and aggregation capabilities.

**Ranking Algorithms:**
- \`hybrid\` (default): Combines keyword matching (BM25) with semantic similarity
- \`bm25\`: Traditional keyword-based ranking
- \`semantic\`: Pure vector similarity search
- \`recency\`: Prioritizes recently created/updated documents
- \`engagement\`: Prioritizes documents with high engagement (reactions, views)

**Facets & Aggregations:**
Enable \`include_facets=true\` to get faceted counts for filtering.
Enable \`include_aggregations=true\` for analytics about the result set.
`,
  request: {
    query: searchQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: searchResponseSchema } },
      description: "Search results retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
    401: {
      content: { "application/json": { schema: errorSchema } },
      description: "Unauthorized",
    },
  },
});

// ============================================================================
// Autocomplete
// ============================================================================

export const autocomplete = createRoute({
  tags,
  method: "get",
  path: "/autocomplete",
  summary: "Autocomplete suggestions",
  description: `
Get search query autocomplete suggestions with support for different suggestion types:
- \`query\`: Previously searched queries
- \`document\`: Document title matches
- \`person\`: People in the organization
- \`action\`: Suggested actions
`,
  request: {
    query: autocompleteQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: autocompleteResponseSchema } },
      description: "Suggestions retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

// ============================================================================
// Recent Documents
// ============================================================================

export const recentDocuments = createRoute({
  tags,
  method: "get",
  path: "/recent",
  summary: "Recent documents",
  description: "Get recently created or updated documents within a time window",
  request: {
    query: recentQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: recentResponseSchema } },
      description: "Recent documents retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

// ============================================================================
// Thread Search
// ============================================================================

export const threadSearch = createRoute({
  tags,
  method: "get",
  path: "/thread/{threadId}",
  summary: "Get thread messages",
  description:
    "Retrieve all messages in a conversation thread, ordered chronologically",
  request: {
    params: threadIdParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: threadResponseSchema } },
      description: "Thread messages retrieved successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Thread not found",
    },
  },
});

// ============================================================================
// Similar Documents
// ============================================================================

export const similarDocuments = createRoute({
  tags,
  method: "get",
  path: "/similar/{documentId}",
  summary: "Find similar documents",
  description:
    "Find documents similar to the given document using vector similarity search",
  request: {
    params: documentIdParamsSchema,
    query: similarQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: similarResponseSchema } },
      description: "Similar documents retrieved successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Document not found",
    },
  },
});

// ============================================================================
// Author Search
// ============================================================================

export const authorSearch = createRoute({
  tags,
  method: "get",
  path: "/author/{authorId}",
  summary: "Search by author",
  description: "Get all documents by a specific author with optional filtering",
  request: {
    params: authorIdParamsSchema,
    query: authorQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: authorResponseSchema } },
      description: "Author documents retrieved successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Author not found",
    },
  },
});

// ============================================================================
// AI Answer
// ============================================================================

export const answerSearch = createRoute({
  tags,
  method: "get",
  path: "/answer",
  summary: "Get AI-generated answer",
  description: `
Get an AI-generated answer to a question based on indexed documents.
The answer includes citations to source documents.

**Note:** This endpoint uses AI and may take longer to respond.
`,
  request: {
    query: answerQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: answerResponseSchema } },
      description: "Answer generated successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
    503: {
      content: { "application/json": { schema: errorSchema } },
      description: "AI service unavailable",
    },
  },
});
