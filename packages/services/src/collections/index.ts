/**
 * Collections Service
 * Business logic for collections and bookmarks
 *
 * Uses @openplane/db for collections/bookmarks and @openplane/vespa for document info.
 */

import prisma, {
  addItemToCollection,
  type CollectionVisibility,
  createBookmark as dbCreateBookmark,
  createCollection as dbCreateCollection,
  deleteBookmark as dbDeleteBookmark,
  deleteCollection as dbDeleteCollection,
  updateBookmark as dbUpdateBookmark,
  updateCollection as dbUpdateCollection,
  getCollectionItems,
  getCollectionWithAccess,
  getUserBookmarkFolders,
  getUserBookmarks,
  getUserCollections,
  removeItemFromCollection,
  reorderCollectionItems,
} from "@openplane/db";
import { documentClient } from "@openplane/vespa";
import type {
  BookmarkSummary,
  CollectionDetail,
  CollectionItem,
  CollectionSummary,
} from "../types";

// ============================================================================
// Types
// ============================================================================

export interface ListCollectionsOptions {
  visibility?: "private" | "team" | "public";
  pinnedOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateCollectionParams {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility?: "private" | "team" | "public";
  isSmartCollection?: boolean;
  smartRules?: Record<string, unknown>;
}

export interface UpdateCollectionParams {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility?: "private" | "team" | "public";
  isPinned?: boolean;
}

export interface ListBookmarksOptions {
  folder?: string;
  tags?: string[];
  documentType?: string;
  limit?: number;
  offset?: number;
}

export interface CreateBookmarkParams {
  documentId: string;
  documentType?: string;
  folder?: string;
  tags?: string[];
  notes?: string;
}

// ============================================================================
// Collections Service Functions
// ============================================================================

/**
 * List user's collections
 */
export async function listCollections(
  teamId: string,
  userId: string,
  options: ListCollectionsOptions = {}
): Promise<{ collections: CollectionSummary[]; total: number }> {
  const { visibility, pinnedOnly, limit = 20, offset = 0 } = options;

  const visibilityMap: Record<string, CollectionVisibility> = {
    private: "PRIVATE",
    team: "TEAM",
    public: "PUBLIC",
  };

  const result = await getUserCollections(prisma, teamId, userId, {
    visibility: visibility ? visibilityMap[visibility] : undefined,
    pinnedOnly,
    limit,
    offset,
  });

  return {
    collections: result.collections.map((c) => mapCollectionResult(c)),
    total: result.total,
  };
}

/**
 * Get a single collection with items
 */
export async function getCollection(
  collectionId: string,
  teamId: string,
  userId: string
): Promise<CollectionDetail | null> {
  const collection = await getCollectionWithAccess(
    prisma,
    collectionId,
    teamId,
    userId
  );

  if (!collection) {
    return null;
  }

  // Get collection items
  const itemsResult = await getCollectionItems(prisma, collectionId, {
    limit: 100,
  });

  return mapCollectionToDetail(collection, itemsResult.items);
}

/**
 * Create a new collection
 */
export async function createCollection(
  teamId: string,
  userId: string,
  params: CreateCollectionParams
): Promise<CollectionDetail> {
  const visibilityMap: Record<string, CollectionVisibility> = {
    private: "PRIVATE",
    team: "TEAM",
    public: "PUBLIC",
  };

  const collection = await dbCreateCollection(prisma, teamId, userId, {
    name: params.name,
    description: params.description,
    icon: params.icon,
    color: params.color,
    visibility: visibilityMap[params.visibility || "private"],
    isSmartCollection: params.isSmartCollection,
    smartRules: params.smartRules,
  });

  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description || undefined,
    icon: collection.icon || undefined,
    color: collection.color || undefined,
    visibility: (collection.visibility?.toLowerCase() || "private") as
      | "private"
      | "team"
      | "public",
    itemCount: 0,
    isPinned: collection.isPinned,
    isSmartCollection: collection.isSmartCollection,
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
    items: [],
  };
}

/**
 * Update a collection
 */
export async function updateCollection(
  collectionId: string,
  teamId: string,
  userId: string,
  params: UpdateCollectionParams
): Promise<CollectionDetail | null> {
  const visibilityMap: Record<string, CollectionVisibility> = {
    private: "PRIVATE",
    team: "TEAM",
    public: "PUBLIC",
  };

  const updated = await dbUpdateCollection(
    prisma,
    collectionId,
    teamId,
    userId,
    {
      name: params.name,
      description: params.description,
      icon: params.icon,
      color: params.color,
      visibility: params.visibility
        ? visibilityMap[params.visibility]
        : undefined,
      isPinned: params.isPinned,
    }
  );

  if (!updated) {
    return null;
  }

  return getCollection(collectionId, teamId, userId);
}

/**
 * Delete a collection
 */
export async function deleteCollection(
  collectionId: string,
  teamId: string,
  userId: string
): Promise<boolean> {
  return await dbDeleteCollection(prisma, collectionId, teamId, userId);
}

/**
 * Add item to collection
 */
export async function addItem(
  collectionId: string,
  teamId: string,
  userId: string,
  item: {
    itemType: "document" | "search" | "link" | "note";
    itemId?: string;
    title?: string;
    description?: string;
    url?: string;
    content?: string;
    tags?: string[];
    notes?: string;
  }
): Promise<CollectionItem | null> {
  // Verify collection access
  const collection = await getCollectionWithAccess(
    prisma,
    collectionId,
    teamId,
    userId
  );

  if (!collection) {
    return null;
  }

  // If it's a document, fetch document info from Vespa
  let title = item.title;
  let url = item.url;
  let thumbnail: string | undefined;

  if (item.itemType === "document" && item.itemId) {
    const doc = await documentClient.get(item.itemId);
    if (doc) {
      title = title || doc.title;
      url = url || doc.url;
      thumbnail = doc.thumbnail;
    }
  }

  const result = await addItemToCollection(prisma, collectionId, userId, {
    itemType: item.itemType,
    itemId: item.itemId,
    title,
    description: item.description,
    url,
    thumbnail,
    content: item.content,
    tags: item.tags,
    notes: item.notes,
  });

  return {
    id: result.id,
    itemType: result.itemType as CollectionItem["itemType"],
    itemId: result.itemId || undefined,
    title: result.title || undefined,
    description: result.description || undefined,
    url: result.url || undefined,
    thumbnail: result.thumbnail || undefined,
    content: result.content || undefined,
    order: result.order,
    notes: result.notes || undefined,
    tags: result.tags,
    addedAt: result.addedAt.toISOString(),
  };
}

/**
 * Remove item from collection
 */
export async function removeItem(
  collectionId: string,
  itemId: string,
  teamId: string,
  userId: string
): Promise<boolean> {
  // Verify collection access
  const collection = await getCollectionWithAccess(
    prisma,
    collectionId,
    teamId,
    userId
  );

  if (!collection) {
    return false;
  }

  return await removeItemFromCollection(prisma, collectionId, itemId);
}

/**
 * Reorder items in collection
 */
export async function reorderItems(
  collectionId: string,
  teamId: string,
  userId: string,
  itemIds: string[]
): Promise<boolean> {
  // Verify collection access
  const collection = await getCollectionWithAccess(
    prisma,
    collectionId,
    teamId,
    userId
  );

  if (!collection) {
    return false;
  }

  await reorderCollectionItems(prisma, collectionId, itemIds);
  return true;
}

// ============================================================================
// Bookmarks Service Functions
// ============================================================================

/**
 * List user's bookmarks
 */
export async function listBookmarks(
  teamId: string,
  userId: string,
  options: ListBookmarksOptions = {}
): Promise<{ bookmarks: BookmarkSummary[]; total: number }> {
  const { folder, tags, documentType, limit = 50, offset = 0 } = options;

  const result = await getUserBookmarks(prisma, teamId, userId, {
    folder,
    documentType,
    tags,
    limit,
    offset,
  });

  return {
    bookmarks: result.bookmarks.map((b) => mapBookmarkResult(b)),
    total: result.total,
  };
}

/**
 * Get bookmark folders
 */
export async function getBookmarkFolders(
  teamId: string,
  userId: string
): Promise<Array<{ name: string; count: number }>> {
  return await getUserBookmarkFolders(prisma, teamId, userId);
}

/**
 * Create a bookmark
 */
export async function createBookmark(
  teamId: string,
  userId: string,
  params: CreateBookmarkParams
): Promise<BookmarkSummary | null> {
  // Get document info from Vespa
  const doc = await documentClient.get(params.documentId);

  if (!doc) {
    return null;
  }

  const bookmark = await dbCreateBookmark(prisma, teamId, userId, {
    documentId: params.documentId,
    documentType: params.documentType || doc.document_type || "document",
    connectorId: doc.connector_id,
    title: doc.title,
    url: doc.url,
    thumbnail: doc.thumbnail,
    folder: params.folder,
    tags: params.tags,
    notes: params.notes,
  });

  return {
    id: bookmark.id,
    documentId: bookmark.documentId,
    documentType: bookmark.documentType,
    title: bookmark.title || undefined,
    url: bookmark.url || undefined,
    thumbnail: bookmark.thumbnail || undefined,
    folder: bookmark.folder || undefined,
    tags: bookmark.tags,
    notes: bookmark.notes || undefined,
    createdAt: bookmark.createdAt.toISOString(),
  };
}

/**
 * Update a bookmark
 */
export async function updateBookmark(
  bookmarkId: string,
  teamId: string,
  userId: string,
  params: { folder?: string; tags?: string[]; notes?: string }
): Promise<BookmarkSummary | null> {
  const updated = await dbUpdateBookmark(
    prisma,
    bookmarkId,
    teamId,
    userId,
    params
  );

  if (!updated) {
    return null;
  }

  return {
    id: updated.id,
    documentId: updated.documentId,
    documentType: updated.documentType,
    title: updated.title || undefined,
    url: updated.url || undefined,
    thumbnail: updated.thumbnail || undefined,
    folder: updated.folder || undefined,
    tags: updated.tags,
    notes: updated.notes || undefined,
    createdAt: updated.createdAt.toISOString(),
  };
}

/**
 * Delete a bookmark
 */
export async function deleteBookmark(
  bookmarkId: string,
  teamId: string,
  userId: string
): Promise<boolean> {
  return await dbDeleteBookmark(prisma, bookmarkId, teamId, userId);
}

// ============================================================================
// Private Helpers
// ============================================================================

function mapCollectionResult(collection: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  visibility: string;
  itemCount: number;
  isPinned: boolean;
  isSmartCollection: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CollectionSummary {
  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description || undefined,
    icon: collection.icon || undefined,
    color: collection.color || undefined,
    visibility: collection.visibility.toLowerCase() as
      | "private"
      | "team"
      | "public",
    itemCount: collection.itemCount,
    isPinned: collection.isPinned,
    isSmartCollection: collection.isSmartCollection,
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
  };
}

function mapCollectionToDetail(
  collection: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    coverImage: string | null;
    visibility: string;
    parentId: string | null;
    itemCount: number;
    collaboratorIds: string[];
    isPinned: boolean;
    isSmartCollection: boolean;
    smartRules: unknown;
    createdAt: Date;
    updatedAt: Date;
  },
  items: Array<{
    id: string;
    itemType: string;
    itemId: string | null;
    title: string | null;
    description: string | null;
    url: string | null;
    thumbnail: string | null;
    content: string | null;
    order: number;
    notes: string | null;
    tags: string[];
    addedAt: Date;
  }>
): CollectionDetail {
  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description || undefined,
    icon: collection.icon || undefined,
    color: collection.color || undefined,
    coverImage: collection.coverImage || undefined,
    visibility: collection.visibility.toLowerCase() as
      | "private"
      | "team"
      | "public",
    parentId: collection.parentId || undefined,
    itemCount: collection.itemCount,
    collaboratorIds: collection.collaboratorIds,
    isPinned: collection.isPinned,
    isSmartCollection: collection.isSmartCollection,
    smartRules: collection.smartRules as Record<string, unknown>,
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
    items: items.map((item) => ({
      id: item.id,
      itemType: item.itemType as CollectionItem["itemType"],
      itemId: item.itemId || undefined,
      title: item.title || undefined,
      description: item.description || undefined,
      url: item.url || undefined,
      thumbnail: item.thumbnail || undefined,
      content: item.content || undefined,
      order: item.order,
      notes: item.notes || undefined,
      tags: item.tags,
      addedAt: item.addedAt.toISOString(),
    })),
  };
}

function mapBookmarkResult(bookmark: {
  id: string;
  documentId: string;
  documentType: string;
  title: string | null;
  url: string | null;
  thumbnail: string | null;
  folder: string | null;
  tags: string[];
  notes: string | null;
  createdAt: Date;
}): BookmarkSummary {
  return {
    id: bookmark.id,
    documentId: bookmark.documentId,
    documentType: bookmark.documentType,
    title: bookmark.title || undefined,
    url: bookmark.url || undefined,
    thumbnail: bookmark.thumbnail || undefined,
    folder: bookmark.folder || undefined,
    tags: bookmark.tags,
    notes: bookmark.notes || undefined,
    createdAt: bookmark.createdAt.toISOString(),
  };
}

// ============================================================================
// Re-export types
// ============================================================================

export type {
  BookmarkSummary,
  CollectionDetail,
  CollectionItem,
  CollectionSummary,
} from "../types";
