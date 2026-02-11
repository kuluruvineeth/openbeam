import {
  archiveSession,
  createNewSession,
  createOrGetSession,
  findSessionById,
  listSessionEvents,
  listSessions,
} from "@openplane/db";
import { TRPCError } from "@trpc/server";
import { verifySessionOwnership } from "../../middleware/session-auth";
import { withActiveTeam } from "../apps/middleware";
import { verifyCanvasAccess } from "./helpers";
import {
  ArchiveSessionInputSchema,
  CreateSessionInputSchema,
  GetOrCreateSessionInputSchema,
  GetSessionEventsInputSchema,
  ListSessionsInputSchema,
} from "./schemas";

export const sessionProcedures = {
  getOrCreateSession: withActiveTeam
    .input(GetOrCreateSessionInputSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId);

      if (input.sessionId) {
        const existing = await findSessionById(
          ctx.prisma,
          input.sessionId,
          ctx.teamId
        );
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Session not found",
          });
        }
        if (existing.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied",
          });
        }
        return existing;
      }

      return createOrGetSession(ctx.prisma, {
        agentCanvasId: input.canvasId,
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
      });
    }),

  createSession: withActiveTeam
    .input(CreateSessionInputSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId);

      return createNewSession(ctx.prisma, {
        agentCanvasId: input.canvasId,
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
        title: input.title,
      });
    }),

  archiveSession: withActiveTeam
    .input(ArchiveSessionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const session = await findSessionById(
        ctx.prisma,
        input.sessionId,
        ctx.teamId
      );

      if (!session || session.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      await archiveSession(ctx.prisma, input.sessionId, ctx.teamId);
      return { success: true };
    }),

  listSessions: withActiveTeam
    .input(ListSessionsInputSchema)
    .query(async ({ ctx, input }) => {
      await verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId);

      return listSessions(ctx.prisma, input.canvasId, ctx.teamId, {
        limit: input.limit,
        offset: input.offset,
        userId: ctx.session.user.id,
      });
    }),

  getSessionEvents: withActiveTeam
    .input(GetSessionEventsInputSchema)
    .query(async ({ ctx, input }) => {
      await verifySessionOwnership({
        db: ctx.prisma,
        sessionId: input.sessionId,
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
      });

      return listSessionEvents(ctx.prisma, input.sessionId, {
        limit: input.limit,
        cursorSequence: input.cursorSequence,
      });
    }),
};
