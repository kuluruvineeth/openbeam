/**
 * Collections & Bookmarks API Handlers
 * Request handlers for collections and bookmark operations
 */

import type { RouteHandler } from "@hono/zod-openapi";
import * as response from "@/lib/response";
import { type AuthEnv, getTeamId } from "@/middleware/auth";
import type {
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
import { collectionsService } from "./collections.service";

// ============================================================================
// Collection Handlers
// ============================================================================

export const listCollectionsHandler: RouteHandler<
  typeof listCollections,
  AuthEnv
> = async (c) => {
  const query = c.req.valid("query");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;

  const { collections, total } = await collectionsService.listCollections(
    teamId,
    userId,
    {
      visibility: query.visibility,
      pinnedOnly: query.pinned_only,
      limit: query.limit,
      offset: query.offset,
    }
  );

  const page = Math.floor(query.offset / query.limit) + 1;

  return response.paginated(c, collections, {
    page,
    pageSize: query.limit,
    total,
  });
};

export const createCollectionHandler: RouteHandler<
  typeof createCollection,
  AuthEnv
> = async (c) => {
  const body = c.req.valid("json");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;

  const collection = await collectionsService.createCollection(teamId, userId, {
    name: body.name,
    description: body.description,
    icon: body.icon,
    color: body.color,
    visibility: body.visibility,
    isSmartCollection: body.isSmartCollection,
    smartRules: body.smartRules as Record<string, unknown> | undefined,
  });

  return response.success(c, collection, 201);
};

export const getCollectionHandler: RouteHandler<
  typeof getCollection,
  AuthEnv
> = async (c) => {
  const { collectionId } = c.req.valid("param");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;

  const collection = await collectionsService.getCollection(
    collectionId,
    teamId,
    userId
  );

  if (!collection) {
    return response.notFound(c, "Collection", collectionId);
  }

  return response.success(c, collection);
};

export const updateCollectionHandler: RouteHandler<
  typeof updateCollection,
  AuthEnv
> = async (c) => {
  const { collectionId } = c.req.valid("param");
  const body = c.req.valid("json");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;

  const collection = await collectionsService.updateCollection(
    collectionId,
    teamId,
    userId,
    body
  );

  if (!collection) {
    return response.notFound(c, "Collection", collectionId);
  }

  return response.success(c, collection);
};

export const deleteCollectionHandler: RouteHandler<
  typeof deleteCollection,
  AuthEnv
> = async (c) => {
  const { collectionId } = c.req.valid("param");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;

  const deleted = await collectionsService.deleteCollection(
    collectionId,
    teamId,
    userId
  );

  if (!deleted) {
    return response.notFound(c, "Collection", collectionId);
  }

  return response.success(c, { message: "Collection deleted successfully" });
};

export const addItemHandler: RouteHandler<typeof addItem, AuthEnv> = async (
  c
) => {
  const { collectionId } = c.req.valid("param");
  const body = c.req.valid("json");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;

  const collection = await collectionsService.addItem(
    collectionId,
    teamId,
    userId,
    body
  );

  if (!collection) {
    return response.notFound(c, "Collection", collectionId);
  }

  return response.success(c, collection, 201);
};

export const removeItemHandler: RouteHandler<
  typeof removeItem,
  AuthEnv
> = async (c) => {
  const { collectionId, itemId } = c.req.valid("param");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;

  const removed = await collectionsService.removeItem(
    collectionId,
    itemId,
    teamId,
    userId
  );

  if (!removed) {
    return response.notFound(c, "Item", itemId);
  }

  return response.success(c, { message: "Item removed successfully" });
};

export const reorderItemsHandler: RouteHandler<
  typeof reorderItems,
  AuthEnv
> = async (c) => {
  const { collectionId } = c.req.valid("param");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;

  // TODO: Implement reorder logic
  const collection = await collectionsService.getCollection(
    collectionId,
    teamId,
    userId
  );

  if (!collection) {
    return response.notFound(c, "Collection", collectionId);
  }

  return response.success(c, collection);
};

// ============================================================================
// Bookmark Handlers
// ============================================================================

export const listBookmarksHandler: RouteHandler<
  typeof listBookmarks,
  AuthEnv
> = async (c) => {
  const query = c.req.valid("query");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;
  const tags = query.tags?.split(",").map((t) => t.trim());

  const { bookmarks, total } = await collectionsService.listBookmarks(
    teamId,
    userId,
    {
      folder: query.folder,
      tags,
      documentType: query.document_type,
      limit: query.limit,
      offset: query.offset,
    }
  );

  const page = Math.floor(query.offset / query.limit) + 1;

  return response.paginated(c, bookmarks, {
    page,
    pageSize: query.limit,
    total,
  });
};

export const getBookmarkFoldersHandler: RouteHandler<
  typeof getBookmarkFolders,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;

  const folders = await collectionsService.getBookmarkFolders(teamId, userId);

  return response.success(c, { folders });
};

export const createBookmarkHandler: RouteHandler<
  typeof createBookmark,
  AuthEnv
> = async (c) => {
  const body = c.req.valid("json");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;

  const bookmark = await collectionsService.createBookmark(
    teamId,
    userId,
    body
  );

  if (!bookmark) {
    return response.conflict(c, "Document is already bookmarked");
  }

  return response.success(c, bookmark, 201);
};

export const updateBookmarkHandler: RouteHandler<
  typeof updateBookmark,
  AuthEnv
> = async (c) => {
  const { bookmarkId } = c.req.valid("param");
  const body = c.req.valid("json");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;

  const bookmark = await collectionsService.updateBookmark(
    bookmarkId,
    teamId,
    userId,
    body
  );

  if (!bookmark) {
    return response.notFound(c, "Bookmark", bookmarkId);
  }

  return response.success(c, bookmark);
};

export const deleteBookmarkHandler: RouteHandler<
  typeof deleteBookmark,
  AuthEnv
> = async (c) => {
  const { bookmarkId } = c.req.valid("param");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;

  const deleted = await collectionsService.deleteBookmark(
    bookmarkId,
    teamId,
    userId
  );

  if (!deleted) {
    return response.notFound(c, "Bookmark", bookmarkId);
  }

  return response.success(c, { message: "Bookmark deleted successfully" });
};
