import { createRoute } from "@hono/zod-openapi";
import {
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

export const mainSearch = createRoute({
  tags,
  method: "get",
  path: "/",
  summary: "Search documents",
  description:
    "Search across all indexed documents with filters and ranking options",
  request: {
    query: searchQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: searchResponseSchema,
        },
      },
      description: "Search results retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const autocomplete = createRoute({
  tags,
  method: "get",
  path: "/autocomplete",
  summary: "Autocomplete suggestions",
  description: "Get search query autocomplete suggestions",
  request: {
    query: autocompleteQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: autocompleteResponseSchema,
        },
      },
      description: "Suggestions retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const recentDocuments = createRoute({
  tags,
  method: "get",
  path: "/recent",
  summary: "Recent documents",
  description: "Get recently created or updated documents",
  request: {
    query: recentQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: recentResponseSchema,
        },
      },
      description: "Recent documents retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const threadSearch = createRoute({
  tags,
  method: "get",
  path: "/thread/{threadId}",
  summary: "Get thread messages",
  description: "Get all messages in a conversation thread",
  request: {
    params: threadIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: threadResponseSchema,
        },
      },
      description: "Thread messages retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const similarDocuments = createRoute({
  tags,
  method: "get",
  path: "/similar/{documentId}",
  summary: "Find similar documents",
  description:
    "Find documents similar to the given document using vector search",
  request: {
    params: documentIdParamsSchema,
    query: similarQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: similarResponseSchema,
        },
      },
      description: "Similar documents retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const authorSearch = createRoute({
  tags,
  method: "get",
  path: "/author/{authorId}",
  summary: "Search by author",
  description: "Get all documents by a specific author",
  request: {
    params: authorIdParamsSchema,
    query: authorQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: authorResponseSchema,
        },
      },
      description: "Author documents retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});
