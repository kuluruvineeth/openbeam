/**
 * Collections Router
 * Internal tRPC routes for collections and bookmarks
 *
 * Uses @openplane/services for all business logic
 */

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
} from "@openplane/services";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "..";

// ============================================================================
// Input Schemas
// ============================================================================

const listCollectionsSchema = z.object({
  visibility: z.enum(["private", "team", "public"]).optional(),
  pinnedOnly: z.boolean().default(false),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

const createCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  visibility: z.enum(["private", "team", "public"]).default("private"),
  isSmartCollection: z.boolean().default(false),
  smartRules: z.record(z.unknown()).optional(),
});

const updateCollectionSchema = z.object({
  collectionId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  visibility: z.enum(["private", "team", "public"]).optional(),
  isPinned: z.boolean().optional(),
});

const addItemSchema = z.object({
  collectionId: z.string(),
  itemType: z.enum(["document", "search", "link", "note"]),
  itemId: z.string().optional(),
  url: z.string().url().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const removeItemSchema = z.object({
  collectionId: z.string(),
  itemId: z.string(),
});

const reorderItemsSchema = z.object({
  collectionId: z.string(),
  itemIds: z.array(z.string()),
});

const listBookmarksSchema = z.object({
  folder: z.string().optional(),
  tags: z.array(z.string()).optional(),
  documentType: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const createBookmarkSchema = z.object({
  documentId: z.string(),
  documentType: z.string().optional(),
  folder: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

const updateBookmarkSchema = z.object({
  bookmarkId: z.string(),
  folder: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// ============================================================================
// Router
// ============================================================================

export const collectionsRouter = createTRPCRouter({
  // ============================================================================
  // Collections
  // ============================================================================

  list: protectedProcedure
    .input(listCollectionsSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await listCollections(teamId, userId, {
        visibility: input.visibility,
        pinnedOnly: input.pinnedOnly,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  get: protectedProcedure
    .input(z.object({ collectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const collection = await getCollection(
        input.collectionId,
        teamId,
        userId
      );

      if (!collection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      return collection;
    }),

  create: protectedProcedure
    .input(createCollectionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await createCollection(teamId, userId, input);
    }),

  update: protectedProcedure
    .input(updateCollectionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const { collectionId, ...updates } = input;
      const result = await updateCollection(
        collectionId,
        teamId,
        userId,
        updates
      );

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ collectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const success = await deleteCollection(
        input.collectionId,
        teamId,
        userId
      );

      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      return { success: true };
    }),

  addItem: protectedProcedure
    .input(addItemSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const { collectionId, ...itemData } = input;
      const item = await addItem(collectionId, teamId, userId, itemData);

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      return item;
    }),

  removeItem: protectedProcedure
    .input(removeItemSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const success = await removeItem(
        input.collectionId,
        input.itemId,
        teamId,
        userId
      );

      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection or item not found",
        });
      }

      return { success: true };
    }),

  reorderItems: protectedProcedure
    .input(reorderItemsSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const success = await reorderItems(
        input.collectionId,
        teamId,
        userId,
        input.itemIds
      );

      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      return { success: true };
    }),

  // ============================================================================
  // Bookmarks
  // ============================================================================

  listBookmarks: protectedProcedure
    .input(listBookmarksSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await listBookmarks(teamId, userId, {
        folder: input.folder,
        tags: input.tags,
        documentType: input.documentType,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  getBookmarkFolders: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const teamId = ctx.session.user.teamId;

    if (!teamId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Team ID required",
      });
    }

    return await getBookmarkFolders(teamId, userId);
  }),

  createBookmark: protectedProcedure
    .input(createBookmarkSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const bookmark = await createBookmark(teamId, userId, input);

      if (!bookmark) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      return bookmark;
    }),

  updateBookmark: protectedProcedure
    .input(updateBookmarkSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const { bookmarkId, ...updates } = input;
      const result = await updateBookmark(bookmarkId, teamId, userId, updates);

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bookmark not found",
        });
      }

      return result;
    }),

  deleteBookmark: protectedProcedure
    .input(z.object({ bookmarkId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const success = await deleteBookmark(input.bookmarkId, teamId, userId);

      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bookmark not found",
        });
      }

      return { success: true };
    }),
});
