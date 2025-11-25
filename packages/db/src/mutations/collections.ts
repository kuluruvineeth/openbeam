import type { Database } from "../index";
import type { CollectionVisibility } from "../queries/collections";

// === Collection Mutation Types ===

export interface CreateCollectionInput {
  teamId: string;
  userId: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  visibility?: CollectionVisibility;
  isSmartCollection?: boolean;
  smartRules?: Record<string, unknown>;
}

export interface UpdateCollectionInput {
  name?: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  visibility?: CollectionVisibility;
  isPinned?: boolean;
  isArchived?: boolean;
  isSmartCollection?: boolean;
  smartRules?: Record<string, unknown>;
  collaboratorIds?: string[];
}

export interface AddCollectionItemInput {
  collectionId: string;
  documentId: string;
  note?: string | null;
}

export interface CreateBookmarkInput {
  teamId: string;
  userId: string;
  documentId: string;
  documentTitle?: string | null;
  documentType?: string | null;
  documentUrl?: string | null;
  note?: string | null;
  folder?: string | null;
  tags?: string[];
}

export interface UpdateBookmarkInput {
  note?: string | null;
  folder?: string | null;
  tags?: string[];
  isPinned?: boolean;
}

// === Collection Mutations ===

/**
 * Create a collection
 */
export const createCollection = async (
  db: Database,
  input: CreateCollectionInput
): Promise<string> => {
  const collection = await db.collection.create({
    data: {
      teamId: input.teamId,
      userId: input.userId,
      name: input.name,
      description: input.description,
      icon: input.icon,
      color: input.color,
      visibility: input.visibility || "PRIVATE",
      isSmartCollection: input.isSmartCollection,
      smartRules: input.smartRules || {},
    },
  });

  return collection.id;
};

/**
 * Update a collection
 */
export const updateCollection = async (
  db: Database,
  collectionId: string,
  teamId: string,
  userId: string,
  input: UpdateCollectionInput
): Promise<boolean> => {
  const result = await db.collection.updateMany({
    where: {
      id: collectionId,
      teamId,
      OR: [{ userId }, { collaboratorIds: { has: userId } }],
    },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.icon !== undefined && { icon: input.icon }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.visibility !== undefined && { visibility: input.visibility }),
      ...(input.isPinned !== undefined && { isPinned: input.isPinned }),
      ...(input.isArchived !== undefined && { isArchived: input.isArchived }),
      ...(input.isSmartCollection !== undefined && {
        isSmartCollection: input.isSmartCollection,
      }),
      ...(input.smartRules !== undefined && { smartRules: input.smartRules }),
      ...(input.collaboratorIds !== undefined && {
        collaboratorIds: input.collaboratorIds,
      }),
      updatedAt: new Date(),
    },
  });

  return result.count > 0;
};

/**
 * Delete a collection
 */
export const deleteCollection = async (
  db: Database,
  collectionId: string,
  teamId: string,
  userId: string
): Promise<boolean> => {
  // First delete all items
  await db.collectionItem.deleteMany({
    where: { collectionId },
  });

  // Then delete the collection
  const result = await db.collection.deleteMany({
    where: {
      id: collectionId,
      teamId,
      userId, // Only owner can delete
    },
  });

  return result.count > 0;
};

/**
 * Add item to collection
 */
export const addItemToCollection = async (
  db: Database,
  input: AddCollectionItemInput
): Promise<string> => {
  // Get current max position
  const maxPosition = await db.collectionItem.aggregate({
    where: { collectionId: input.collectionId },
    _max: { position: true },
  });

  const newPosition = (maxPosition._max.position || 0) + 1;

  const item = await db.collectionItem.create({
    data: {
      collectionId: input.collectionId,
      documentId: input.documentId,
      note: input.note,
      position: newPosition,
    },
  });

  // Update item count
  await db.collection.update({
    where: { id: input.collectionId },
    data: {
      itemCount: { increment: 1 },
      updatedAt: new Date(),
    },
  });

  return item.id;
};

/**
 * Remove item from collection
 */
export const removeItemFromCollection = async (
  db: Database,
  collectionId: string,
  documentId: string
): Promise<boolean> => {
  const result = await db.collectionItem.deleteMany({
    where: { collectionId, documentId },
  });

  if (result.count > 0) {
    // Update item count
    await db.collection.update({
      where: { id: collectionId },
      data: {
        itemCount: { decrement: result.count },
        updatedAt: new Date(),
      },
    });
  }

  return result.count > 0;
};

/**
 * Reorder items in collection
 */
export const reorderCollectionItems = async (
  db: Database,
  collectionId: string,
  itemIds: string[]
): Promise<void> => {
  await db.$transaction(
    itemIds.map((id, index) =>
      db.collectionItem.updateMany({
        where: { id, collectionId },
        data: { position: index },
      })
    )
  );
};

/**
 * Pin/unpin collection
 */
export const toggleCollectionPin = async (
  db: Database,
  collectionId: string,
  teamId: string,
  userId: string,
  isPinned: boolean
): Promise<boolean> => {
  const result = await db.collection.updateMany({
    where: {
      id: collectionId,
      teamId,
      OR: [{ userId }, { collaboratorIds: { has: userId } }],
    },
    data: {
      isPinned,
      updatedAt: new Date(),
    },
  });

  return result.count > 0;
};

/**
 * Archive/unarchive collection
 */
export const toggleCollectionArchive = async (
  db: Database,
  collectionId: string,
  teamId: string,
  userId: string,
  isArchived: boolean
): Promise<boolean> => {
  const result = await db.collection.updateMany({
    where: {
      id: collectionId,
      teamId,
      userId,
    },
    data: {
      isArchived,
      updatedAt: new Date(),
    },
  });

  return result.count > 0;
};

// === Bookmark Mutations ===

/**
 * Create a bookmark
 */
export const createBookmark = async (
  db: Database,
  input: CreateBookmarkInput
): Promise<string> => {
  const bookmark = await db.bookmark.create({
    data: {
      teamId: input.teamId,
      userId: input.userId,
      documentId: input.documentId,
      documentTitle: input.documentTitle,
      documentType: input.documentType,
      documentUrl: input.documentUrl,
      note: input.note,
      folder: input.folder,
      tags: input.tags || [],
    },
  });

  return bookmark.id;
};

/**
 * Update a bookmark
 */
export const updateBookmark = async (
  db: Database,
  bookmarkId: string,
  teamId: string,
  userId: string,
  input: UpdateBookmarkInput
): Promise<boolean> => {
  const result = await db.bookmark.updateMany({
    where: {
      id: bookmarkId,
      teamId,
      userId,
    },
    data: {
      ...(input.note !== undefined && { note: input.note }),
      ...(input.folder !== undefined && { folder: input.folder }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.isPinned !== undefined && { isPinned: input.isPinned }),
      updatedAt: new Date(),
    },
  });

  return result.count > 0;
};

/**
 * Delete a bookmark
 */
export const deleteBookmark = async (
  db: Database,
  bookmarkId: string,
  teamId: string,
  userId: string
): Promise<boolean> => {
  const result = await db.bookmark.deleteMany({
    where: {
      id: bookmarkId,
      teamId,
      userId,
    },
  });

  return result.count > 0;
};

/**
 * Delete bookmark by document
 */
export const deleteBookmarkByDocument = async (
  db: Database,
  teamId: string,
  userId: string,
  documentId: string
): Promise<boolean> => {
  const result = await db.bookmark.deleteMany({
    where: {
      teamId,
      userId,
      documentId,
    },
  });

  return result.count > 0;
};

/**
 * Toggle bookmark pin
 */
export const toggleBookmarkPin = async (
  db: Database,
  bookmarkId: string,
  teamId: string,
  userId: string,
  isPinned: boolean
): Promise<boolean> => {
  const result = await db.bookmark.updateMany({
    where: {
      id: bookmarkId,
      teamId,
      userId,
    },
    data: {
      isPinned,
      updatedAt: new Date(),
    },
  });

  return result.count > 0;
};

/**
 * Move bookmark to folder
 */
export const moveBookmarkToFolder = async (
  db: Database,
  bookmarkId: string,
  teamId: string,
  userId: string,
  folder: string | null
): Promise<boolean> => {
  const result = await db.bookmark.updateMany({
    where: {
      id: bookmarkId,
      teamId,
      userId,
    },
    data: {
      folder,
      updatedAt: new Date(),
    },
  });

  return result.count > 0;
};

/**
 * Bulk update bookmark tags
 */
export const updateBookmarkTags = async (
  db: Database,
  bookmarkId: string,
  teamId: string,
  userId: string,
  tags: string[]
): Promise<boolean> => {
  const result = await db.bookmark.updateMany({
    where: {
      id: bookmarkId,
      teamId,
      userId,
    },
    data: {
      tags,
      updatedAt: new Date(),
    },
  });

  return result.count > 0;
};
