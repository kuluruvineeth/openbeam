/**
 * Collections & Bookmarks API Routes
 * OpenAPI route definitions for collections and bookmark operations
 */

import { createRoute } from "@hono/zod-openapi";
import {
  addItemBodySchema,
  bookmarkIdParamsSchema,
  bookmarkResponseSchema,
  collectionIdParamsSchema,
  collectionResponseSchema,
  createBookmarkBodySchema,
  createCollectionBodySchema,
  deleteResponseSchema,
  errorSchema,
  foldersResponseSchema,
  listBookmarksQuerySchema,
  listBookmarksResponseSchema,
  listCollectionsQuerySchema,
  listCollectionsResponseSchema,
  reorderItemsBodySchema,
  updateBookmarkBodySchema,
  updateCollectionBodySchema,
} from "./collections.schema";

const collectionTags = ["Collections"];
const bookmarkTags = ["Bookmarks"];

// ============================================================================
// Collection Routes
// ============================================================================

export const listCollections = createRoute({
  tags: collectionTags,
  method: "get",
  path: "/collections",
  summary: "List collections",
  description: "Retrieve a list of the user's collections",
  request: {
    query: listCollectionsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: listCollectionsResponseSchema },
      },
      description: "Collections retrieved successfully",
    },
  },
});

export const createCollection = createRoute({
  tags: collectionTags,
  method: "post",
  path: "/collections",
  summary: "Create collection",
  description: "Create a new collection",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createCollectionBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: collectionResponseSchema } },
      description: "Collection created successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const getCollection = createRoute({
  tags: collectionTags,
  method: "get",
  path: "/collections/{collectionId}",
  summary: "Get collection",
  description: "Retrieve a specific collection with its items",
  request: {
    params: collectionIdParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: collectionResponseSchema } },
      description: "Collection retrieved successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Collection not found",
    },
  },
});

export const updateCollection = createRoute({
  tags: collectionTags,
  method: "patch",
  path: "/collections/{collectionId}",
  summary: "Update collection",
  description: "Update a collection's properties",
  request: {
    params: collectionIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: updateCollectionBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: collectionResponseSchema } },
      description: "Collection updated successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Collection not found",
    },
  },
});

export const deleteCollection = createRoute({
  tags: collectionTags,
  method: "delete",
  path: "/collections/{collectionId}",
  summary: "Delete collection",
  description: "Delete a collection and its items",
  request: {
    params: collectionIdParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: deleteResponseSchema } },
      description: "Collection deleted successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Collection not found",
    },
  },
});

export const addItem = createRoute({
  tags: collectionTags,
  method: "post",
  path: "/collections/{collectionId}/items",
  summary: "Add item to collection",
  description: "Add a document, link, or note to a collection",
  request: {
    params: collectionIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: addItemBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: collectionResponseSchema } },
      description: "Item added successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Collection not found",
    },
  },
});

export const removeItem = createRoute({
  tags: collectionTags,
  method: "delete",
  path: "/collections/{collectionId}/items/{itemId}",
  summary: "Remove item from collection",
  description: "Remove an item from a collection",
  request: {
    params: collectionIdParamsSchema.extend({
      itemId: collectionIdParamsSchema.shape.collectionId.openapi({
        param: {
          name: "itemId",
          in: "path",
        },
        description: "Item identifier",
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: deleteResponseSchema } },
      description: "Item removed successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Item not found",
    },
  },
});

export const reorderItems = createRoute({
  tags: collectionTags,
  method: "put",
  path: "/collections/{collectionId}/items/order",
  summary: "Reorder collection items",
  description: "Update the order of items in a collection",
  request: {
    params: collectionIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: reorderItemsBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: collectionResponseSchema } },
      description: "Items reordered successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Collection not found",
    },
  },
});

// ============================================================================
// Bookmark Routes
// ============================================================================

export const listBookmarks = createRoute({
  tags: bookmarkTags,
  method: "get",
  path: "/bookmarks",
  summary: "List bookmarks",
  description: "Retrieve a list of the user's bookmarks",
  request: {
    query: listBookmarksQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: listBookmarksResponseSchema } },
      description: "Bookmarks retrieved successfully",
    },
  },
});

export const getBookmarkFolders = createRoute({
  tags: bookmarkTags,
  method: "get",
  path: "/bookmarks/folders",
  summary: "Get bookmark folders",
  description: "Retrieve all bookmark folders with counts",
  responses: {
    200: {
      content: { "application/json": { schema: foldersResponseSchema } },
      description: "Folders retrieved successfully",
    },
  },
});

export const createBookmark = createRoute({
  tags: bookmarkTags,
  method: "post",
  path: "/bookmarks",
  summary: "Create bookmark",
  description: "Bookmark a document",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createBookmarkBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: bookmarkResponseSchema } },
      description: "Bookmark created successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
    409: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bookmark already exists",
    },
  },
});

export const updateBookmark = createRoute({
  tags: bookmarkTags,
  method: "patch",
  path: "/bookmarks/{bookmarkId}",
  summary: "Update bookmark",
  description: "Update a bookmark's properties",
  request: {
    params: bookmarkIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: updateBookmarkBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: bookmarkResponseSchema } },
      description: "Bookmark updated successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bookmark not found",
    },
  },
});

export const deleteBookmark = createRoute({
  tags: bookmarkTags,
  method: "delete",
  path: "/bookmarks/{bookmarkId}",
  summary: "Delete bookmark",
  description: "Remove a bookmark",
  request: {
    params: bookmarkIdParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: deleteResponseSchema } },
      description: "Bookmark deleted successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bookmark not found",
    },
  },
});
