/**
 * Preferences Router
 * Internal tRPC routes for user preferences and settings
 * Uses @openplane/db for all database operations
 */

import {
  clearRecentItems,
  createPinnedItem,
  deletePinnedItem,
  getMaxPinnedItemOrder,
  getPinnedItems,
  getRecentItems,
  getUserPreferences,
  reorderPinnedItems,
  trackRecentItem,
  updateOnboardingStep,
  upsertUserPreferences,
} from "@openplane/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "..";

// ============================================================================
// Input Schemas
// ============================================================================

const updatePreferencesSchema = z.object({
  // Search preferences
  defaultSearchScope: z.array(z.string()).optional(),
  defaultDocTypes: z.array(z.string()).optional(),
  defaultRankProfile: z
    .enum(["bm25", "semantic", "hybrid", "recency"])
    .optional(),
  searchResultSize: z.number().min(10).max(100).optional(),

  // Display preferences
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  dateFormat: z.enum(["relative", "absolute", "iso"]).optional(),

  // Notification preferences
  emailDigest: z
    .enum(["realtime", "hourly", "daily", "weekly", "never"])
    .optional(),
  searchAlerts: z.boolean().optional(),
  mentionNotifications: z.boolean().optional(),

  // AI preferences
  aiEnabled: z.boolean().optional(),
  showAiAnswers: z.boolean().optional(),
  aiModel: z.string().optional(),

  // Privacy
  trackHistory: z.boolean().optional(),
  shareActivity: z.boolean().optional(),
});

const pinnedItemSchema = z.object({
  itemType: z.enum(["document", "search", "collection", "assistant", "action"]),
  itemId: z.string(),
  title: z.string().optional(),
  icon: z.string().optional(),
  url: z.string().optional(),
  location: z.enum(["sidebar", "home", "search"]).default("sidebar"),
});

const recentItemSchema = z.object({
  itemType: z.enum(["document", "search", "collection", "assistant"]),
  itemId: z.string(),
  title: z.string().optional(),
  url: z.string().optional(),
});

// ============================================================================
// Router
// ============================================================================

export const preferencesRouter = createTRPCRouter({
  /**
   * Get user preferences
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const teamId = ctx.session.user.teamId;

    if (!teamId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Team ID required",
      });
    }

    let preferences = await getUserPreferences(ctx.prisma, userId);

    if (!preferences) {
      // Create default preferences
      preferences = await upsertUserPreferences(ctx.prisma, {
        teamId,
        userId,
        data: {},
      });
    }

    return preferences;
  }),

  /**
   * Update user preferences
   */
  update: protectedProcedure
    .input(updatePreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await upsertUserPreferences(ctx.prisma, {
        teamId,
        userId,
        data: input,
      });
    }),

  /**
   * Get pinned items
   */
  getPinnedItems: protectedProcedure
    .input(
      z.object({
        location: z.enum(["sidebar", "home", "search"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await getPinnedItems(ctx.prisma, {
        teamId,
        userId,
        location: input.location,
      });
    }),

  /**
   * Pin an item
   */
  pinItem: protectedProcedure
    .input(pinnedItemSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      // Get max order
      const maxOrder = await getMaxPinnedItemOrder(ctx.prisma, {
        teamId,
        userId,
        location: input.location,
      });

      return await createPinnedItem(ctx.prisma, {
        teamId,
        userId,
        itemType: input.itemType,
        itemId: input.itemId,
        title: input.title,
        icon: input.icon,
        url: input.url,
        location: input.location,
        order: maxOrder + 1,
      });
    }),

  /**
   * Unpin an item
   */
  unpinItem: protectedProcedure
    .input(
      z.object({
        itemType: z.string(),
        itemId: z.string(),
        location: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      await deletePinnedItem(ctx.prisma, {
        teamId,
        userId,
        itemType: input.itemType,
        itemId: input.itemId,
        location: input.location,
      });

      return { success: true };
    }),

  /**
   * Reorder pinned items
   */
  reorderPinnedItems: protectedProcedure
    .input(
      z.object({
        location: z.enum(["sidebar", "home", "search"]),
        itemIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      await reorderPinnedItems(ctx.prisma, {
        teamId,
        userId,
        location: input.location,
        itemIds: input.itemIds,
      });

      return { success: true };
    }),

  /**
   * Get recent items
   */
  getRecentItems: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        itemType: z
          .enum(["document", "search", "collection", "assistant"])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await getRecentItems(ctx.prisma, {
        teamId,
        userId,
        itemType: input.itemType,
        limit: input.limit,
      });
    }),

  /**
   * Track a recent item
   */
  trackRecentItem: protectedProcedure
    .input(recentItemSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await trackRecentItem(ctx.prisma, {
        teamId,
        userId,
        itemType: input.itemType,
        itemId: input.itemId,
        title: input.title,
        url: input.url,
      });
    }),

  /**
   * Clear recent items
   */
  clearRecentItems: protectedProcedure
    .input(
      z.object({
        itemType: z
          .enum(["document", "search", "collection", "assistant"])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      await clearRecentItems(ctx.prisma, {
        teamId,
        userId,
        itemType: input.itemType,
      });

      return { success: true };
    }),

  /**
   * Complete onboarding step
   */
  completeOnboardingStep: protectedProcedure
    .input(z.object({ step: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await updateOnboardingStep(ctx.prisma, {
        teamId,
        userId,
        step: input.step,
        totalSteps: 5,
      });
    }),
});
