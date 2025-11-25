/**
 * Collections & Bookmarks API Module
 * Entry point for collections and bookmark operations
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/scopes";
import {
  addItemHandler,
  createBookmarkHandler,
  createCollectionHandler,
  deleteBookmarkHandler,
  deleteCollectionHandler,
  getBookmarkFoldersHandler,
  getCollectionHandler,
  listBookmarksHandler,
  listCollectionsHandler,
  removeItemHandler,
  reorderItemsHandler,
  updateBookmarkHandler,
  updateCollectionHandler,
} from "./collections.handlers";
import {
  addItem,
  createBookmark,
  createCollection,
  deleteBookmark,
  deleteCollection,
  getBookmarkFolders,
  getCollection,
  listBookmarks,
  listCollections,
  removeItem,
  reorderItems,
  updateBookmark,
  updateCollection,
} from "./collections.routes";

const collections = new OpenAPIHono<AuthEnv>();

// Apply auth middleware globally
collections.use("/*", requireAuth);

// ============================================================================
// Collection Endpoints
// ============================================================================

// List collections
collections.use("/collections", requireScopes([API_SCOPES.COLLECTIONS_READ]));
collections.openapi(listCollections, listCollectionsHandler);

// Create collection
collections.use("/collections", requireScopes([API_SCOPES.COLLECTIONS_WRITE]));
collections.openapi(createCollection, createCollectionHandler);

// Get collection
collections.use(
  "/collections/:collectionId",
  requireScopes([API_SCOPES.COLLECTIONS_READ])
);
collections.openapi(getCollection, getCollectionHandler);

// Update collection
collections.use(
  "/collections/:collectionId",
  requireScopes([API_SCOPES.COLLECTIONS_WRITE])
);
collections.openapi(updateCollection, updateCollectionHandler);

// Delete collection
collections.use(
  "/collections/:collectionId",
  requireScopes([API_SCOPES.COLLECTIONS_DELETE])
);
collections.openapi(deleteCollection, deleteCollectionHandler);

// Add item
collections.openapi(addItem, addItemHandler);

// Remove item
collections.openapi(removeItem, removeItemHandler);

// Reorder items
collections.openapi(reorderItems, reorderItemsHandler);

// ============================================================================
// Bookmark Endpoints
// ============================================================================

// List bookmarks
collections.use("/bookmarks", requireScopes([API_SCOPES.BOOKMARKS_READ]));
collections.openapi(listBookmarks, listBookmarksHandler);

// Get bookmark folders
collections.openapi(getBookmarkFolders, getBookmarkFoldersHandler);

// Create bookmark
collections.use("/bookmarks", requireScopes([API_SCOPES.BOOKMARKS_WRITE]));
collections.openapi(createBookmark, createBookmarkHandler);

// Update bookmark
collections.use(
  "/bookmarks/:bookmarkId",
  requireScopes([API_SCOPES.BOOKMARKS_WRITE])
);
collections.openapi(updateBookmark, updateBookmarkHandler);

// Delete bookmark
collections.openapi(deleteBookmark, deleteBookmarkHandler);

export default collections;
