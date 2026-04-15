import {
  createResearchSession,
  getResearchSession,
  listResearchSessions,
  updateResearchSession,
} from "@openbeam/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

export const researchRouter = createTRPCRouter({
  start: withActiveTeam
    .input(
      z.object({
        prompt: z.string().min(1).max(10_000),
        options: z
          .object({
            maxSteps: z.number().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await createResearchSession(ctx.prisma, {
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
        prompt: input.prompt,
        status: "PENDING",
      });

      return {
        sessionId: session.id,
        workflowId: session.workflowId,
      };
    }),

  progress: withActiveTeam
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await getResearchSession(ctx.prisma, input.sessionId);

      if (!session || session.teamId !== ctx.teamId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Research session not found",
        });
      }

      return {
        status: session.status,
        progress: session.progress,
        plan: session.plan,
        error: session.error,
      };
    }),

  artifacts: withActiveTeam
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await getResearchSession(ctx.prisma, input.sessionId);

      if (!session || session.teamId !== ctx.teamId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Research session not found",
        });
      }

      return {
        report: session.report,
        evidence: session.evidence,
        tokenUsage: session.tokenUsage,
      };
    }),

  cancel: withActiveTeam
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await getResearchSession(ctx.prisma, input.sessionId);

      if (!session || session.teamId !== ctx.teamId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Research session not found",
        });
      }

      if (session.status === "COMPLETED" || session.status === "FAILED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Session already finished",
        });
      }

      await updateResearchSession(ctx.prisma, input.sessionId, {
        status: "CANCELLED",
      });

      return { cancelled: true };
    }),

  list: withActiveTeam
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(({ ctx, input }) =>
      listResearchSessions(ctx.prisma, ctx.teamId, input.limit)
    ),
});
