import { createRoute } from "@hono/zod-openapi";
import {
  authorIdParamsSchema,
  authorQuerySchema,
  authorResponseSchema,
  documentIdParamsSchema,
  errorSchema,
  hybridSearchQuerySchema,
  hybridSearchResponseSchema,
  mediaSearchQuerySchema,
  mediaSearchResponseSchema,
  recentQuerySchema,
  recentResponseSchema,
  searchQuerySchema,
  searchResponseSchema,
  similarQuerySchema,
  similarResponseSchema,
  threadIdParamsSchema,
  threadResponseSchema,
  unifiedSearchQuerySchema,
  unifiedSearchResponseSchema,
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

export const mediaSearch = createRoute({
  tags: ["Search", "Media"],
  method: "get",
  path: "/media",
  summary: "Search media",
  description:
    "Search across all indexed media using text query with TwelveLabs embeddings",
  request: {
    query: mediaSearchQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: mediaSearchResponseSchema,
        },
      },
      description: "Media search results retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const unifiedSearch = createRoute({
  tags: ["Search"],
  method: "get",
  path: "/unified",
  summary: "Unified search",
  description: "Search across both documents and media in a single query",
  request: {
    query: unifiedSearchQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: unifiedSearchResponseSchema,
        },
      },
      description: "Unified search results retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const hybridSearch = createRoute({
  tags,
  method: "get",
  path: "/hybrid",
  summary: "Hybrid search with RRF",
  description:
    "Search using BGE-M3 embeddings with Reciprocal Rank Fusion (BM25 + dense + sparse)",
  request: {
    query: hybridSearchQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: hybridSearchResponseSchema,
        },
      },
      description: "Hybrid search results with timing and rank metadata",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});
