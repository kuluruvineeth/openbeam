/**
 * Actions Router
 * Internal tRPC routes for MCP tools and action execution
 *
 * Uses @openplane/services for all business logic
 */

import {
  executeAction,
  getAction,
  getExecutionHistory,
  listActions,
} from "@openplane/services";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "..";

// ============================================================================
// Input Schemas
// ============================================================================

const listActionsSchema = z.object({
  category: z.string().optional(),
  tag: z.string().optional(),
  aiEnabledOnly: z.boolean().optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

const executeActionSchema = z.object({
  actionId: z.string(),
  input: z.record(z.unknown()),
  dryRun: z.boolean().default(false),
  confirm: z.boolean().default(false),
});

const executionHistorySchema = z.object({
  actionId: z.string(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

// ============================================================================
// Router
// ============================================================================

export const actionsRouter = createTRPCRouter({
  /**
   * List available actions
   */
  list: protectedProcedure
    .input(listActionsSchema)
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await listActions(teamId, {
        category: input.category,
        tag: input.tag,
        aiEnabledOnly: input.aiEnabledOnly,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  /**
   * Get action details
   */
  get: protectedProcedure
    .input(z.object({ actionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const action = await getAction(input.actionId, teamId);

      if (!action) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Action not found",
        });
      }

      return action;
    }),

  /**
   * Execute an action
   */
  execute: protectedProcedure
    .input(executeActionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      try {
        return await executeAction(input.actionId, teamId, userId, {
          input: input.input,
          dryRun: input.dryRun,
          confirmedBy: input.confirm ? userId : undefined,
        });
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error instanceof Error ? error.message : "Action not found",
        });
      }
    }),

  /**
   * Get execution history for an action
   */
  history: protectedProcedure
    .input(executionHistorySchema)
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await getExecutionHistory(input.actionId, teamId, {
        limit: input.limit,
        offset: input.offset,
      });
    }),
});
