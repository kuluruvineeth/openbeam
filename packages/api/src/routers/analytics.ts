import type { Database } from "@openbeam/db";
import {
  getImpressionById,
  recordSearchClick,
  recordSearchImpression,
  updateSearchClickDwellTime,
  updateSearchClickFeedback,
} from "@openbeam/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

const TimingSchema = z.object({
  embeddingMs: z.number(),
  retrievalMs: z.number(),
  fusionMs: z.number(),
  rerankMs: z.number().optional(),
  ltrMs: z.number().optional(),
  totalMs: z.number(),
});

const RRFConfigSchema = z
  .object({
    k: z.number(),
    weights: z.object({
      bm25: z.number(),
      dense: z.number(),
      sparse: z.number(),
    }),
  })
  .optional();

const ImpressionInputSchema = z.object({
  query: z.string().min(1).max(1000),
  resultDocIds: z.array(z.string()).min(1).max(100),
  mode: z.string(),
  experimentId: z.string().optional(),
  variant: z.enum(["control", "treatment"]).optional(),
  timing: TimingSchema,
  rrfConfig: RRFConfigSchema,
});

const ClickInputSchema = z.object({
  impressionId: z.string().min(1),
  docId: z.string().min(1),
  position: z.number().int().min(0).max(100),
  dwellTimeMs: z.number().int().min(0).optional(),
  feedbackType: z.enum(["helpful", "not_helpful"]).optional(),
});

const UpdateDwellTimeSchema = z.object({
  impressionId: z.string().min(1),
  docId: z.string().min(1),
  dwellTimeMs: z.number().int().min(0),
});

const SubmitFeedbackSchema = z.object({
  impressionId: z.string().min(1),
  docId: z.string().min(1),
  feedbackType: z.enum(["helpful", "not_helpful"]),
});

async function requireOwnedImpression(
  db: Database,
  impressionId: string,
  teamId: string
) {
  const impression = await getImpressionById(db, impressionId);

  if (!impression) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Impression not found",
    });
  }

  if (impression.teamId !== teamId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Access denied",
    });
  }

  return impression;
}

export const analyticsRouter = createTRPCRouter({
  recordImpression: withActiveTeam
    .input(ImpressionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const impression = await recordSearchImpression(ctx.prisma, {
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
        query: input.query,
        resultDocIds: input.resultDocIds,
        experimentId: input.experimentId,
        variant: input.variant,
        timing: input.timing,
        rrfConfig: input.rrfConfig,
        mode: input.mode,
      });

      return { impressionId: impression.id };
    }),

  recordClick: withActiveTeam
    .input(ClickInputSchema)
    .mutation(async ({ ctx, input }) => {
      await requireOwnedImpression(ctx.prisma, input.impressionId, ctx.teamId);

      await recordSearchClick(ctx.prisma, {
        impressionId: input.impressionId,
        docId: input.docId,
        position: input.position,
        dwellTimeMs: input.dwellTimeMs,
        feedbackType: input.feedbackType,
      });

      return { success: true };
    }),

  updateDwellTime: withActiveTeam
    .input(UpdateDwellTimeSchema)
    .mutation(async ({ ctx, input }) => {
      await requireOwnedImpression(ctx.prisma, input.impressionId, ctx.teamId);

      await updateSearchClickDwellTime(ctx.prisma, {
        impressionId: input.impressionId,
        docId: input.docId,
        dwellTimeMs: input.dwellTimeMs,
      });

      return { success: true };
    }),

  submitFeedback: withActiveTeam
    .input(SubmitFeedbackSchema)
    .mutation(async ({ ctx, input }) => {
      await requireOwnedImpression(ctx.prisma, input.impressionId, ctx.teamId);

      await updateSearchClickFeedback(ctx.prisma, {
        impressionId: input.impressionId,
        docId: input.docId,
        feedbackType: input.feedbackType,
      });

      return { success: true };
    }),
});
