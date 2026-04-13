import {
  advanceOnboardingStep,
  completeOnboarding,
  createOnboardingState,
  getOnboardingState,
  hasCompletedOnboarding,
  skipOnboarding,
} from "@openbeam/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

const STEP_ORDER = [
  "WELCOME",
  "CONNECT_SOURCE",
  "SYNC_PROGRESS",
  "FIRST_SEARCH",
  "COMPLETED",
] as const;

function getNextStep(current: string): string | null {
  const idx = STEP_ORDER.indexOf(current as (typeof STEP_ORDER)[number]);
  if (idx === -1 || idx >= STEP_ORDER.length - 1) {
    return null;
  }
  return STEP_ORDER[idx + 1] ?? null;
}

export const onboardingRouter = createTRPCRouter({
  getState: withActiveTeam.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const state = await getOnboardingState(ctx.prisma, userId, ctx.teamId);

    if (!state) {
      return { needsOnboarding: true, state: null };
    }

    return { needsOnboarding: false, state };
  }),

  initialize: withActiveTeam.mutation(({ ctx }) => {
    const userId = ctx.session.user.id;
    return createOnboardingState(ctx.prisma, userId, ctx.teamId);
  }),

  advance: withActiveTeam
    .input(
      z.object({
        connectorId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const state = await getOnboardingState(ctx.prisma, userId, ctx.teamId);

      if (!state || state.status !== "IN_PROGRESS") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active onboarding session",
        });
      }

      const nextStep = getNextStep(state.currentStep);
      if (!nextStep) {
        return completeOnboarding(ctx.prisma, userId, ctx.teamId);
      }

      return advanceOnboardingStep(
        ctx.prisma,
        userId,
        ctx.teamId,
        state.currentStep,
        nextStep as Parameters<typeof advanceOnboardingStep>[4],
        input.connectorId
      );
    }),

  skip: withActiveTeam.mutation(({ ctx }) => {
    const userId = ctx.session.user.id;
    return skipOnboarding(ctx.prisma, userId, ctx.teamId);
  }),

  complete: withActiveTeam.mutation(({ ctx }) => {
    const userId = ctx.session.user.id;
    return completeOnboarding(ctx.prisma, userId, ctx.teamId);
  }),

  isCompleted: withActiveTeam.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const completed = await hasCompletedOnboarding(
      ctx.prisma,
      userId,
      ctx.teamId
    );
    return { completed };
  }),
});
