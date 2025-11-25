/**
 * Collections & Bookmarks Service
 * Business logic for collections and bookmark operations
 *
 * Uses @openplane/db queries/mutations and @openplane/vespa documentClient.
 */

import prisma, {
  // Bookmark operations
  addItemToCollection,
  type CollectionVisibility,
  // Collections
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
  isDocumentBookmarked,
  removeItemFromCollection,
  reorderCollectionItems,
} from "@openplane/db";
import { documentClient } from "@openplane/vespa";
import type {
  CollectionDetail,
  CollectionItem,
  CollectionSummary,
} from "@/types/api";

// ============================================================================
// Types
// ============================================================================

export interface BookmarkSummary {
  id: string;
  documentId: string;
  documentType: string;
  title?: string;
  url?: string;
  thumbnail?: string;
  folder?: string;
  tags: string[];
  notes?: string;
  accessCount: number;
  lastAccessedAt?: string;
  createdAt: string;
}

// ============================================================================
// Service Class
// ============================================================================

export class CollectionsService {
  // ============================================================================
  // Collections
  // ============================================================================

  /**
   * List user's collections
   * Uses @db getUserCollections query
   */
  async listCollections(
    teamId: string,
    userId: string,
    options: {
      visibility?: "private" | "team" | "public";
      pinnedOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {}
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
      collections: result.collections.map((c) => this.mapCollectionResult(c)),
      total: result.total,
    };
  }

  /**
   * Get a single collection with items
   * Uses @db getCollectionWithAccess and getCollectionItems
   */
  async getCollection(
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

    return this.mapCollectionToDetail(collection, itemsResult.items);
  }

  /**
   * Create a new collection
   * Uses @db createCollection mutation
   */
  async createCollection(
    teamId: string,
    userId: string,
    data: {
      name: string;
      description?: string;
      icon?: string;
      color?: string;
      visibility?: "private" | "team" | "public";
      isSmartCollection?: boolean;
      smartRules?: Record<string, unknown>;
    }
  ): Promise<CollectionDetail> {
    const visibilityMap: Record<string, CollectionVisibility> = {
      private: "PRIVATE",
      team: "TEAM",
      public: "PUBLIC",
    };

    const collectionId = await dbCreateCollection(prisma, {
      teamId,
      userId,
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color,
      visibility: visibilityMap[data.visibility || "private"],
      isSmartCollection: data.isSmartCollection,
      smartRules: data.smartRules,
    });

    // Fetch and return the created collection
    const collection = await this.getCollection(collectionId, teamId, userId);
    if (!collection) {
      throw new Error("Failed to create collection");
    }

    return collection;
  }

  /**
   * Update a collection
   * Uses @db updateCollection mutation
   */
  async updateCollection(
    collectionId: string,
    teamId: string,
    userId: string,
    data: Partial<{
      name: string;
      description: string;
      icon: string;
      color: string;
      visibility: "private" | "team" | "public";
      isSmartCollection: boolean;
      smartRules: Record<string, unknown>;
    }>
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
        name: data.name,
        description: data.description,
        icon: data.icon,
        color: data.color,
        visibility: data.visibility
          ? visibilityMap[data.visibility]
          : undefined,
        isSmartCollection: data.isSmartCollection,
        smartRules: data.smartRules,
      }
    );

    if (!updated) {
      return null;
    }

    return this.getCollection(collectionId, teamId, userId);
  }

  /**
   * Delete a collection
   * Uses @db deleteCollection mutation
   */
  async deleteCollection(
    collectionId: string,
    teamId: string,
    userId: string
  ): Promise<boolean> {
    return await dbDeleteCollection(prisma, collectionId, teamId, userId);
  }

  /**
   * Add item to collection
   * Uses @db addItemToCollection mutation
   */
  async addItem(
    collectionId: string,
    teamId: string,
    userId: string,
    data: {
      type: "document" | "search" | "link" | "note";
      documentId?: string;
      url?: string;
      title?: string;
      description?: string;
      notes?: string;
    }
  ): Promise<CollectionDetail | null> {
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

    // Add item to collection
    if (data.documentId) {
      await addItemToCollection(prisma, {
        collectionId,
        documentId: data.documentId,
        note: data.notes,
      });
    }

    return this.getCollection(collectionId, teamId, userId);
  }

  /**
   * Remove item from collection
   * Uses @db removeItemFromCollection mutation
   */
  async removeItem(
    collectionId: string,
    documentId: string,
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

    return await removeItemFromCollection(prisma, collectionId, documentId);
  }

  /**
   * Reorder items in collection
   * Uses @db reorderCollectionItems mutation
   */
  async reorderItems(
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
  // Bookmarks
  // ============================================================================

  /**
   * List user's bookmarks
   * Uses @db getUserBookmarks query
   */
  async listBookmarks(
    teamId: string,
    userId: string,
    options: {
      folder?: string;
      tags?: string[];
      documentType?: string;
      limit?: number;
      offset?: number;
    } = {}
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
      bookmarks: result.bookmarks.map((b) => this.mapBookmarkResult(b)),
      total: result.total,
    };
  }

  /**
   * Get bookmark folders
   * Uses @db getUserBookmarkFolders query
   */
  async getBookmarkFolders(
    teamId: string,
    userId: string
  ): Promise<Array<{ name: string; count: number }>> {
    return await getUserBookmarkFolders(prisma, teamId, userId);
  }

  /**
   * Create a bookmark
   * Uses @db createBookmark mutation and @vespa documentClient
   */
  async createBookmark(
    teamId: string,
    userId: string,
    data: {
      documentId: string;
      folder?: string;
      tags?: string[];
      notes?: string;
    }
  ): Promise<BookmarkSummary | null> {
    // Check if already bookmarked
    const alreadyBookmarked = await isDocumentBookmarked(
      prisma,
      teamId,
      userId,
      data.documentId
    );

    if (alreadyBookmarked) {
      return null;
    }

    // Get document info from Vespa using documentClient
    const doc = await documentClient.get(data.documentId);

    const bookmarkId = await dbCreateBookmark(prisma, {
      teamId,
      userId,
      documentId: data.documentId,
      documentType: doc?.document_type || "document",
      documentTitle: doc?.title,
      documentUrl: doc?.url,
      folder: data.folder,
      tags: data.tags,
      note: data.notes,
    });

    // Fetch and return the created bookmark
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
    });

    return bookmark ? this.mapBookmark(bookmark) : null;
  }

  /**
   * Update a bookmark
   * Uses @db updateBookmark mutation
   */
  async updateBookmark(
    bookmarkId: string,
    teamId: string,
    userId: string,
    data: {
      folder?: string;
      tags?: string[];
      notes?: string;
    }
  ): Promise<BookmarkSummary | null> {
    const updated = await dbUpdateBookmark(prisma, bookmarkId, teamId, userId, {
      folder: data.folder,
      tags: data.tags,
      note: data.notes,
    });

    if (!updated) {
      return null;
    }

    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
    });

    return bookmark ? this.mapBookmark(bookmark) : null;
  }

  /**
   * Delete a bookmark
   * Uses @db deleteBookmark mutation
   */
  async deleteBookmark(
    bookmarkId: string,
    teamId: string,
    userId: string
  ): Promise<boolean> {
    return await dbDeleteBookmark(prisma, bookmarkId, teamId, userId);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private mapCollectionResult(collection: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    visibility: CollectionVisibility;
    itemCount: number;
    isPinned: boolean;
    isSmartCollection: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CollectionSummary {
    return {
      id: collection.id,
      name: collection.name,
      slug: this.generateSlug(collection.name),
      description: collection.description || undefined,
      icon: collection.icon || undefined,
      color: collection.color || undefined,
      visibility:
        collection.visibility.toLowerCase() as CollectionSummary["visibility"],
      itemCount: collection.itemCount,
      isPinned: collection.isPinned,
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
    };
  }

  private mapCollectionToDetail(
    collection: {
      id: string;
      name: string;
      description: string | null;
      icon: string | null;
      color: string | null;
      visibility: CollectionVisibility;
      itemCount: number;
      isPinned: boolean;
      isSmartCollection: boolean;
      smartRules: Record<string, unknown>;
      collaboratorIds: string[];
      createdAt: Date;
      updatedAt: Date;
    },
    items: Array<{
      id: string;
      documentId: string;
      note: string | null;
      position: number;
      addedAt: Date;
    }>
  ): CollectionDetail {
    return {
      id: collection.id,
      name: collection.name,
      slug: this.generateSlug(collection.name),
      description: collection.description || undefined,
      icon: collection.icon || undefined,
      color: collection.color || undefined,
      visibility:
        collection.visibility.toLowerCase() as CollectionSummary["visibility"],
      itemCount: collection.itemCount,
      isPinned: collection.isPinned,
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
      items: items.map((item) => ({
        id: item.id,
        type: "document" as CollectionItem["type"],
        documentId: item.documentId,
        notes: item.note || undefined,
        order: item.position,
        addedAt: item.addedAt.toISOString(),
        addedBy: "", // Would need to track this
      })),
      collaborators: collection.collaboratorIds,
      isSmartCollection: collection.isSmartCollection,
      smartRules: collection.smartRules,
    };
  }

  private mapBookmarkResult(bookmark: {
    id: string;
    documentId: string;
    documentType: string | null;
    documentTitle: string | null;
    documentUrl: string | null;
    folder: string | null;
    tags: string[];
    isPinned: boolean;
    createdAt: Date;
  }): BookmarkSummary {
    return {
      id: bookmark.id,
      documentId: bookmark.documentId,
      documentType: bookmark.documentType || "document",
      title: bookmark.documentTitle || undefined,
      url: bookmark.documentUrl || undefined,
      folder: bookmark.folder || undefined,
      tags: bookmark.tags,
      accessCount: 0,
      createdAt: bookmark.createdAt.toISOString(),
    };
  }

  private mapBookmark(bookmark: {
    id: string;
    documentId: string;
    documentType: string;
    title?: string | null;
    url?: string | null;
    thumbnail?: string | null;
    folder?: string | null;
    tags: string[];
    notes?: string | null;
    accessCount: number;
    lastAccessedAt?: Date | null;
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
      accessCount: bookmark.accessCount,
      lastAccessedAt: bookmark.lastAccessedAt?.toISOString(),
      createdAt: bookmark.createdAt.toISOString(),
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const collectionsService = new CollectionsService();
