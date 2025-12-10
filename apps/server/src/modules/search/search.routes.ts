import { createRoute } from "@hono/zod-openapi";
import {
  authorIdParamsSchema,
  authorQuerySchema,
  authorResponseSchema,
  autocompleteQuerySchema,
  autocompleteResponseSchema,
  documentIdParamsSchema,
  errorSchema,
  imageSearchQuerySchema,
  imageSearchResponseSchema,
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
  videoSearchQuerySchema,
  videoSearchResponseSchema,
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

export const videoSearch = createRoute({
  tags: ["Search", "Video"],
  method: "get",
  path: "/videos",
  summary: "Search videos",
  description:
    "Search across all indexed videos using text query with TwelveLabs embeddings",
  request: {
    query: videoSearchQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: videoSearchResponseSchema,
        },
      },
      description: "Video search results retrieved successfully",
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
  description: "Search across both documents and videos in a single query",
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

export const imageSearch = createRoute({
  tags: ["Search", "Video"],
  method: "get",
  path: "/videos/image",
  summary: "Search videos by image",
  description: "Find videos containing similar visual content to a given image",
  request: {
    query: imageSearchQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: imageSearchResponseSchema,
        },
      },
      description: "Image search results retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});
