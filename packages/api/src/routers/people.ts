/**
 * People Router
 * Internal tRPC routes for people/directory operations
 *
 * Uses @openplane/services for all business logic
 */

import {
  getOrgChart,
  getPerson,
  getPersonDocuments,
  listPeople,
  searchPeople,
} from "@openplane/services";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "..";

// ============================================================================
// Input Schemas
// ============================================================================

const listPeopleSchema = z.object({
  query: z.string().optional(),
  department: z.string().optional(),
  connectorType: z.string().optional(),
  excludeBots: z.boolean().default(true),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const searchPeopleSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(20).default(10),
  excludeBots: z.boolean().default(true),
});

const personDocumentsSchema = z.object({
  personId: z.string(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
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

export const peopleRouter = createTRPCRouter({
  /**
   * List/search people in directory
   */
  list: protectedProcedure
    .input(listPeopleSchema)
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await listPeople(teamId, {
        query: input.query,
        department: input.department,
        connectorType: input.connectorType,
        excludeBots: input.excludeBots,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  /**
   * Quick search for autocomplete
   */
  search: protectedProcedure
    .input(searchPeopleSchema)
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const people = await searchPeople(input.query, teamId, {
        limit: input.limit,
        excludeBots: input.excludeBots,
      });

      return { people, query: input.query };
    }),

  /**
   * Get person details
   */
  get: protectedProcedure
    .input(z.object({ personId: z.string() }))
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const person = await getPerson(input.personId, teamId);

      if (!person) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Person not found",
        });
      }

      return person;
    }),

  /**
   * Get person's documents
   */
  documents: protectedProcedure
    .input(personDocumentsSchema)
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await getPersonDocuments(input.personId, teamId, {
        limit: input.limit,
        offset: input.offset,
        accessControlIds: getAccessControlIds(ctx.session),
      });
    }),

  /**
   * Get org chart for a person
   */
  orgChart: protectedProcedure
    .input(z.object({ personId: z.string() }))
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const result = await getOrgChart(input.personId, teamId);

      if (!result.person) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Person not found",
        });
      }

      return result;
    }),
});
