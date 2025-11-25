/**
 * Analytics Router
 * Internal tRPC routes for analytics and usage metrics
 *
 * Uses @openplane/services for all business logic
 */

import {
  getDocumentAnalytics,
  getSearchAnalytics,
  getTeamUsageMetrics,
  getUserAnalytics,
  recordFeedback,
  trackInteraction,
  trackSearch,
} from "@openplane/services";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "..";

// ============================================================================
// Input Schemas
// ============================================================================

const searchAnalyticsSchema = z.object({
  days: z.number().min(1).max(90).default(30),
});

const documentAnalyticsSchema = z.object({
  documentId: z.string(),
});

const usageMetricsSchema = z.object({
  periodType: z.enum(["daily", "monthly"]).default("daily"),
  limit: z.number().min(1).max(90).default(30),
});

const trackInteractionSchema = z.object({
  type: z.string(),
  documentId: z.string().optional(),
  documentType: z.string().optional(),
  connectorId: z.string().optional(),
  searchSessionId: z.string().optional(),
  searchQuery: z.string().optional(),
  resultPosition: z.number().optional(),
  dwellTimeMs: z.number().optional(),
  source: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const trackSearchSchema = z.object({
  query: z.string(),
  searchType: z.string().optional(),
  filters: z.record(z.unknown()).optional(),
  totalResults: z.number(),
  resultsShown: z.number(),
  resultIds: z.array(z.string()).optional(),
  latencyMs: z.number().optional(),
  aiAnswerGenerated: z.boolean().optional(),
});

const feedbackSchema = z.object({
  type: z.enum([
    "search_result",
    "ai_answer",
    "document",
    "suggestion",
    "feature",
  ]),
  sentiment: z.enum(["positive", "negative", "neutral"]),
  documentId: z.string().optional(),
  searchSessionId: z.string().optional(),
  conversationId: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().optional(),
  query: z.string().optional(),
  answer: z.string().optional(),
});

// ============================================================================
// Router
// ============================================================================

export const analyticsRouter = createTRPCRouter({
  /**
   * Get search analytics for the team
   */
  searchAnalytics: protectedProcedure
    .input(searchAnalyticsSchema)
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await getSearchAnalytics(teamId, { days: input.days });
    }),

  /**
   * Get document analytics
   */
  documentAnalytics: protectedProcedure
    .input(documentAnalyticsSchema)
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const analytics = await getDocumentAnalytics(input.documentId, teamId);

      if (!analytics) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document analytics not found",
        });
      }

      return analytics;
    }),

  /**
   * Get user's own analytics
   */
  myAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const teamId = ctx.session.user.teamId;

    if (!teamId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Team ID required",
      });
    }

    return await getUserAnalytics(userId, teamId);
  }),

  /**
   * Get team usage metrics
   */
  usageMetrics: protectedProcedure
    .input(usageMetricsSchema)
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await getTeamUsageMetrics(teamId, {
        periodType: input.periodType,
        limit: input.limit,
      });
    }),

  /**
   * Track user interaction
   */
  trackInteraction: protectedProcedure
    .input(trackInteractionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      await trackInteraction({
        teamId,
        userId,
        ...input,
      });

      return { success: true };
    }),

  /**
   * Track search session
   */
  trackSearch: protectedProcedure
    .input(trackSearchSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const sessionId = await trackSearch({
        teamId,
        userId,
        ...input,
      });

      return { sessionId };
    }),

  /**
   * Record feedback
   */
  feedback: protectedProcedure
    .input(feedbackSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      await recordFeedback({
        teamId,
        userId,
        ...input,
      });

      return { success: true };
    }),
});
