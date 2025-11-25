import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

// === Collection Query Types ===

export type CollectionVisibility = "PRIVATE" | "TEAM" | "PUBLIC";

export interface CollectionResult {
  id: string;
  teamId: string;
  userId: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  visibility: CollectionVisibility;
  isPinned: boolean;
  isArchived: boolean;
  isSmartCollection: boolean;
  smartRules: Record<string, unknown>;
  itemCount: number;
  collaboratorIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionItemResult {
  id: string;
  collectionId: string;
  documentId: string;
  note: string | null;
  position: number;
  addedAt: Date;
}

export interface BookmarkResult {
  id: string;
  teamId: string;
  userId: string;
  documentId: string;
  documentTitle: string | null;
  documentType: string | null;
  documentUrl: string | null;
  note: string | null;
  folder: string | null;
  tags: string[];
  isPinned: boolean;
  createdAt: Date;
}

// === Collection Queries ===

/**
 * Get collection by ID
 */
export const getCollectionById = async (
  db: Database,
  collectionId: string
): Promise<CollectionResult | null> => {
  const collection = await db.collection.findUnique({
    where: { id: collectionId },
  });

  if (!collection) {
    return null;
  }

  return {
    ...collection,
    smartRules: (collection.smartRules as Record<string, unknown>) || {},
  };
};

/**
 * Get collection with access check
 */
export const getCollectionWithAccess = async (
  db: Database,
  collectionId: string,
  teamId: string,
  userId: string
): Promise<CollectionResult | null> => {
  const collection = await db.collection.findFirst({
    where: {
      id: collectionId,
      teamId,
      OR: [
        { userId },
        { collaboratorIds: { has: userId } },
        { visibility: "PUBLIC" },
        { visibility: "TEAM" },
      ],
    },
  });

  if (!collection) {
    return null;
  }

  return {
    ...collection,
    smartRules: (collection.smartRules as Record<string, unknown>) || {},
  };
};

/**
 * List user's collections
 */
export const getUserCollections = async (
  db: Database,
  teamId: string,
  userId: string,
  options: {
    visibility?: CollectionVisibility;
    pinnedOnly?: boolean;
    includeArchived?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ collections: CollectionResult[]; total: number }> => {
  const {
    limit = 50,
    offset = 0,
    pinnedOnly,
    visibility,
    includeArchived,
  } = options;

  const where: Prisma.CollectionWhereInput = {
    teamId,
    OR: [
      { userId },
      { collaboratorIds: { has: userId } },
      { visibility: "PUBLIC" },
      { visibility: "TEAM" },
    ],
  };

  if (!includeArchived) {
    where.isArchived = false;
  }

  if (pinnedOnly) {
    where.isPinned = true;
  }

  if (visibility) {
    where.visibility = visibility;
  }

  const [collections, total] = await Promise.all([
    db.collection.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    db.collection.count({ where }),
  ]);

  return {
    collections: collections.map((c) => ({
      ...c,
      smartRules: (c.smartRules as Record<string, unknown>) || {},
    })),
    total,
  };
};

/**
 * Get collection items
 */
export const getCollectionItems = async (
  db: Database,
  collectionId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ items: CollectionItemResult[]; total: number }> => {
  const { limit = 50, offset = 0 } = options;

  const [items, total] = await Promise.all([
    db.collectionItem.findMany({
      where: { collectionId },
      orderBy: { position: "asc" },
      take: limit,
      skip: offset,
    }),
    db.collectionItem.count({ where: { collectionId } }),
  ]);

  return { items, total };
};

/**
 * Check if document is in collection
 */
export const isDocumentInCollection = async (
  db: Database,
  collectionId: string,
  documentId: string
): Promise<boolean> => {
  const item = await db.collectionItem.findFirst({
    where: { collectionId, documentId },
    select: { id: true },
  });
  return !!item;
};

// === Bookmark Queries ===

/**
 * Get bookmark by ID
 */
export const getBookmarkById = async (
  db: Database,
  bookmarkId: string
): Promise<BookmarkResult | null> => {
  const bookmark = await db.bookmark.findUnique({
    where: { id: bookmarkId },
  });

  if (!bookmark) {
    return null;
  }

  return bookmark;
};

/**
 * Get user's bookmark for a document
 */
export const getUserDocumentBookmark = async (
  db: Database,
  teamId: string,
  userId: string,
  documentId: string
): Promise<BookmarkResult | null> => {
  const bookmark = await db.bookmark.findFirst({
    where: { teamId, userId, documentId },
  });

  if (!bookmark) {
    return null;
  }

  return bookmark;
};

/**
 * List user's bookmarks
 */
export const getUserBookmarks = async (
  db: Database,
  teamId: string,
  userId: string,
  options: {
    folder?: string;
    documentType?: string;
    tags?: string[];
    pinnedOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ bookmarks: BookmarkResult[]; total: number }> => {
  const {
    limit = 50,
    offset = 0,
    folder,
    documentType,
    tags,
    pinnedOnly,
  } = options;

  const where: Prisma.BookmarkWhereInput = {
    teamId,
    userId,
  };

  if (folder) {
    where.folder = folder;
  }

  if (documentType) {
    where.documentType = documentType;
  }

  if (tags && tags.length > 0) {
    where.tags = { hasSome: tags };
  }

  if (pinnedOnly) {
    where.isPinned = true;
  }

  const [bookmarks, total] = await Promise.all([
    db.bookmark.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    db.bookmark.count({ where }),
  ]);

  return { bookmarks, total };
};

/**
 * Get bookmark folders for a user
 */
export const getUserBookmarkFolders = async (
  db: Database,
  teamId: string,
  userId: string
): Promise<Array<{ name: string; count: number }>> => {
  const folders = await db.bookmark.groupBy({
    by: ["folder"],
    where: {
      teamId,
      userId,
      folder: { not: null },
    },
    _count: { id: true },
  });

  return folders
    .filter((f) => f.folder)
    .map((f) => ({
      name: f.folder as string,
      count: f._count.id,
    }));
};

/**
 * Check if document is bookmarked
 */
export const isDocumentBookmarked = async (
  db: Database,
  teamId: string,
  userId: string,
  documentId: string
): Promise<boolean> => {
  const bookmark = await db.bookmark.findFirst({
    where: { teamId, userId, documentId },
    select: { id: true },
  });
  return !!bookmark;
};

/**
 * Count user's bookmarks
 */
export const countUserBookmarks = async (
  db: Database,
  teamId: string,
  userId: string
): Promise<number> =>
  await db.bookmark.count({
    where: { teamId, userId },
  });
