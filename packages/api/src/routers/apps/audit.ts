/**
 * Audit Router
 * View connector audit logs and sync events
 */

import {
  getAuditActionTypes,
  getDeadLetterById,
  listConnectorAuditLogs,
  listDeadLetters,
  listSyncEvents,
  resolveDeadLetter,
  retryDeadLetter,
  verifyConnectorOwnership,
  verifySyncJobTeamAccess,
} from "@openplane/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { withActiveTeam, withAdmin } from "./middleware";

// ============================================================================
// Schemas
// ============================================================================

const listAuditLogsSchema = z.object({
  connectorId: z.string(),
  action: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const listSyncEventsSchema = z.object({
  syncJobId: z.string(),
  eventType: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const listDeadLettersSchema = z.object({
  connectorId: z.string(),
  status: z.enum(["pending", "retrying", "resolved", "abandoned"]).optional(),
  errorType: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// ============================================================================
// Router
// ============================================================================

export const auditRouter = createTRPCRouter({
  /**
   * List connector audit logs
   */
  listLogs: withActiveTeam
    .input(listAuditLogsSchema)
    .query(async ({ ctx, input }) => {
      const connector = await verifyConnectorOwnership(
        ctx.prisma,
        input.connectorId,
        ctx.teamId
      );

      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found or unauthorized",
        });
      }

      const result = await listConnectorAuditLogs(
        ctx.prisma,
        input.connectorId,
        {
          action: input.action,
          userId: input.userId,
          startDate: input.startDate,
          endDate: input.endDate,
          limit: input.limit,
          offset: input.offset,
        }
      );

      return {
        logs: result.logs,
        pagination: {
          limit: input.limit,
          offset: input.offset,
          total: result.total,
          hasMore: input.offset + result.logs.length < result.total,
        },
      };
    }),

  /**
   * List sync events for a job
   */
  listSyncEvents: withActiveTeam
    .input(listSyncEventsSchema)
    .query(async ({ ctx, input }) => {
      // Verify sync job belongs to team's connector
      const hasAccess = await verifySyncJobTeamAccess(
        ctx.prisma,
        input.syncJobId,
        ctx.teamId
      );

      if (!hasAccess) {
        return {
          events: [],
          pagination: {
            limit: input.limit,
            offset: input.offset,
            total: 0,
            hasMore: false,
          },
        };
      }

      const result = await listSyncEvents(ctx.prisma, input.syncJobId, {
        eventType: input.eventType,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        events: result.events,
        pagination: {
          limit: input.limit,
          offset: input.offset,
          total: result.total,
          hasMore: input.offset + result.events.length < result.total,
        },
      };
    }),

  /**
   * List dead letter items for a connector
   */
  listDeadLetters: withActiveTeam
    .input(listDeadLettersSchema)
    .query(async ({ ctx, input }) => {
      const connector = await verifyConnectorOwnership(
        ctx.prisma,
        input.connectorId,
        ctx.teamId
      );

      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found or unauthorized",
        });
      }

      const result = await listDeadLetters(ctx.prisma, input.connectorId, {
        status: input.status,
        errorType: input.errorType,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        items: result.items,
        pagination: {
          limit: input.limit,
          offset: input.offset,
          total: result.total,
          hasMore: input.offset + result.items.length < result.total,
        },
      };
    }),

  /**
   * Retry a dead letter item
   */
  retryDeadLetter: withActiveTeam
    .input(z.object({ deadLetterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await getDeadLetterById(
        ctx.prisma,
        input.deadLetterId,
        ctx.teamId
      );

      if (!item) {
        return { success: false, error: "Item not found or unauthorized" };
      }

      await retryDeadLetter(ctx.prisma, input.deadLetterId);

      return { success: true };
    }),

  /**
   * Resolve a dead letter item (mark as skipped)
   */
  resolveDeadLetter: withAdmin
    .input(
      z.object({
        deadLetterId: z.string(),
        resolution: z.enum(["skipped", "manual_fix"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const item = await getDeadLetterById(
        ctx.prisma,
        input.deadLetterId,
        ctx.teamId
      );

      if (!item) {
        return { success: false, error: "Item not found or unauthorized" };
      }

      await resolveDeadLetter(
        ctx.prisma,
        input.deadLetterId,
        ctx.session.user.id,
        input.resolution
      );

      return { success: true };
    }),

  /**
   * Get audit action types for a connector
   */
  actionTypes: withActiveTeam
    .input(z.object({ connectorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const connector = await verifyConnectorOwnership(
        ctx.prisma,
        input.connectorId,
        ctx.teamId
      );

      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found or unauthorized",
        });
      }

      return getAuditActionTypes(ctx.prisma, input.connectorId);
    }),
});
