/**
 * Search Router
 * Internal tRPC routes for search operations
 *
 * Uses @openplane/services for all business logic
 */

import {
  autocomplete,
  createSavedSearchEntry,
  deleteSavedSearchEntry,
  findSimilar,
  getRecentDocuments,
  getSavedSearchById,
  listFeaturedSearches,
  listSavedSearches,
  runSavedSearch,
  search,
  searchByAuthor,
  searchThread,
  toggleSavedSearchPinStatus,
  updateSavedSearchEntry,
} from "@openplane/services";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "..";

// ============================================================================
// Input Schemas
// ============================================================================

const searchInputSchema = z.object({
  query: z.string(),
  connectorTypes: z.array(z.string()).optional(),
  connectorIds: z.array(z.string()).optional(),
  documentTypes: z.array(z.string()).optional(),
  fromDate: z.number().optional(),
  toDate: z.number().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  ranking: z
    .enum(["bm25", "semantic", "hybrid", "recency", "engagement"])
    .default("hybrid"),
  includeFacets: z.boolean().default(false),
  includeAggregations: z.boolean().default(false),
});

const autocompleteInputSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(20).default(10),
  types: z.array(z.enum(["query", "document", "person", "action"])).optional(),
});

const recentInputSchema = z.object({
  hours: z.number().min(1).max(168).default(24),
  limit: z.number().min(1).max(100).default(20),
  connectorTypes: z.array(z.string()).optional(),
  documentTypes: z.array(z.string()).optional(),
});

const similarInputSchema = z.object({
  documentId: z.string(),
  limit: z.number().min(1).max(50).default(10),
  minScore: z.number().min(0).max(1).optional(),
});

const threadInputSchema = z.object({
  threadId: z.string(),
});

const authorInputSchema = z.object({
  authorId: z.string(),
  limit: z.number().min(1).max(100).default(50),
  documentTypes: z.array(z.string()).optional(),
  fromDate: z.number().optional(),
  toDate: z.number().optional(),
});

// Saved Searches schemas
const listSavedSearchesSchema = z.object({
  visibility: z.enum(["PRIVATE", "TEAM", "PUBLIC"]).optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

const createSavedSearchSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  query: z.string(),
  filters: z.record(z.unknown()).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["relevance", "date", "popularity"]).optional(),
  rankProfile: z.enum(["bm25", "semantic", "hybrid", "recency"]).optional(),
  connectorIds: z.array(z.string()).optional(),
  projectIds: z.array(z.string()).optional(),
  viewMode: z.enum(["list", "grid", "compact"]).optional(),
  pageSize: z.number().min(10).max(100).optional(),
  visibility: z.enum(["PRIVATE", "TEAM", "PUBLIC"]).optional(),
  alertEnabled: z.boolean().optional(),
  alertFrequency: z.enum(["realtime", "hourly", "daily", "weekly"]).optional(),
});

const updateSavedSearchSchema = z.object({
  searchId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  filters: z.record(z.unknown()).optional(),
  visibility: z.enum(["PRIVATE", "TEAM", "PUBLIC"]).optional(),
  alertEnabled: z.boolean().optional(),
  alertFrequency: z.enum(["realtime", "hourly", "daily", "weekly"]).optional(),
});

// ============================================================================
// Helper
// ============================================================================

function getAccessControlIds(session: {
  user: { id: string; email?: string | null };
}): string[] {
  return [session.user.id, session.user.email].filter(Boolean) as string[];
}

// ============================================================================
// Router
// ============================================================================

export const searchRouter = createTRPCRouter({
  /**
   * Main search
   */
  search: protectedProcedure
    .input(searchInputSchema)
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const result = await search({
        query: input.query,
        teamId,
        accessControlIds: getAccessControlIds(ctx.session),
        connectorTypes: input.connectorTypes,
        connectorIds: input.connectorIds,
        documentTypes: input.documentTypes,
        fromDate: input.fromDate,
        toDate: input.toDate,
        limit: input.limit,
        offset: input.offset,
        ranking: input.ranking,
        includeFacets: input.includeFacets,
        includeAggregations: input.includeAggregations,
      });

      return result;
    }),

  /**
   * Autocomplete suggestions
   */
  autocomplete: protectedProcedure
    .input(autocompleteInputSchema)
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const suggestions = await autocomplete(input.query, teamId, {
        limit: input.limit,
        types: input.types,
        accessControlIds: getAccessControlIds(ctx.session),
      });

      return { suggestions, query: input.query };
    }),

  /**
   * Recent documents
   */
  recent: protectedProcedure
    .input(recentInputSchema)
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const documents = await getRecentDocuments(teamId, {
        hours: input.hours,
        limit: input.limit,
        connectorTypes: input.connectorTypes,
        documentTypes: input.documentTypes,
        accessControlIds: getAccessControlIds(ctx.session),
      });

      return { documents, hours: input.hours };
    }),

  /**
   * Similar documents
   */
  similar: protectedProcedure
    .input(similarInputSchema)
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      try {
        const result = await findSimilar(input.documentId, teamId, {
          limit: input.limit,
          minScore: input.minScore,
          accessControlIds: getAccessControlIds(ctx.session),
        });

        return result;
      } catch (_error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }
    }),

  /**
   * Thread messages
   */
  thread: protectedProcedure
    .input(threadInputSchema)
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const result = await searchThread(
        input.threadId,
        teamId,
        getAccessControlIds(ctx.session)
      );

      return { threadId: input.threadId, ...result };
    }),

  /**
   * Documents by author
   */
  byAuthor: protectedProcedure
    .input(authorInputSchema)
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const result = await searchByAuthor(input.authorId, teamId, {
        limit: input.limit,
        documentTypes: input.documentTypes,
        fromDate: input.fromDate,
        toDate: input.toDate,
        accessControlIds: getAccessControlIds(ctx.session),
      });

      return { authorId: input.authorId, ...result };
    }),

  // ============================================================================
  // Saved Searches
  // ============================================================================

  /**
   * List saved searches
   */
  listSaved: protectedProcedure
    .input(listSavedSearchesSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await listSavedSearches(teamId, userId, {
        visibility: input.visibility,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  /**
   * Get featured saved searches
   */
  featured: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const searches = await listFeaturedSearches(teamId, input.limit);
      return { searches };
    }),

  /**
   * Get a saved search by ID
   */
  getSaved: protectedProcedure
    .input(z.object({ searchId: z.string() }))
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const savedSearch = await getSavedSearchById(input.searchId, teamId);

      if (!savedSearch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Saved search not found",
        });
      }

      return savedSearch;
    }),

  /**
   * Create a saved search
   */
  createSaved: protectedProcedure
    .input(createSavedSearchSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await createSavedSearchEntry(teamId, userId, input);
    }),

  /**
   * Update a saved search
   */
  updateSaved: protectedProcedure
    .input(updateSavedSearchSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const { searchId, ...data } = input;
      const result = await updateSavedSearchEntry(
        searchId,
        teamId,
        userId,
        data
      );

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Saved search not found",
        });
      }

      return result;
    }),

  /**
   * Delete a saved search
   */
  deleteSaved: protectedProcedure
    .input(z.object({ searchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const success = await deleteSavedSearchEntry(
        input.searchId,
        teamId,
        userId
      );

      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Saved search not found",
        });
      }

      return { success: true };
    }),

  /**
   * Toggle pin on a saved search
   */
  togglePin: protectedProcedure
    .input(z.object({ searchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const result = await toggleSavedSearchPinStatus(
        input.searchId,
        teamId,
        userId
      );

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Saved search not found",
        });
      }

      return result;
    }),

  /**
   * Run a saved search
   */
  runSaved: protectedProcedure
    .input(z.object({ searchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      // Get the saved search first
      const savedSearch = await getSavedSearchById(input.searchId, teamId);

      if (!savedSearch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Saved search not found",
        });
      }

      // Increment run count
      await runSavedSearch(input.searchId);

      // Execute the search
      const result = await search({
        query: savedSearch.query,
        teamId,
        accessControlIds: getAccessControlIds(ctx.session),
        connectorIds: savedSearch.connectorIds,
        ranking: savedSearch.rankProfile as
          | "bm25"
          | "semantic"
          | "hybrid"
          | "recency"
          | "engagement",
        limit: savedSearch.pageSize,
      });

      return result;
    }),
});
