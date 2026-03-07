import {
  addControlApprovalCommentForTeam,
  approveControlApprovalForTeam,
  createControlApprovalForTeam,
  getControlApprovalForTeam,
  linkControlIssueToApprovalForTeam,
  listControlApprovalsForTeam,
  rejectControlApprovalForTeam,
  requestControlApprovalRevisionForTeam,
} from "@openbeam/services";
import { CreateControlApprovalInputSchema } from "@openbeam/types/control/validators/approvals";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { withActiveTeam } from "../apps/middleware";
import { mapControlError } from "./middleware";

export const approvalsRouter = createTRPCRouter({
  list: withActiveTeam
    .input(
      z.object({
        status: z.string().optional(),
        type: z.string().optional(),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listControlApprovalsForTeam(ctx.prisma, ctx.teamId, {
          status: input.status,
          type: input.type,
          limit: input.limit,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  get: withActiveTeam
    .input(z.object({ approvalId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await getControlApprovalForTeam(
          ctx.prisma,
          ctx.teamId,
          input.approvalId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  create: withActiveTeam
    .input(CreateControlApprovalInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createControlApprovalForTeam(
          ctx.prisma,
          ctx.teamId,
          input
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  approve: withActiveTeam
    .input(
      z.object({
        approvalId: z.string().min(1),
        decisionNote: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await approveControlApprovalForTeam(ctx.prisma, {
          teamId: ctx.teamId,
          approvalId: input.approvalId,
          decidedByUserId: ctx.session.user.id,
          decisionNote: input.decisionNote,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  reject: withActiveTeam
    .input(
      z.object({
        approvalId: z.string().min(1),
        decisionNote: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await rejectControlApprovalForTeam(ctx.prisma, {
          teamId: ctx.teamId,
          approvalId: input.approvalId,
          decidedByUserId: ctx.session.user.id,
          decisionNote: input.decisionNote,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  requestRevision: withActiveTeam
    .input(
      z.object({
        approvalId: z.string().min(1),
        decisionNote: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await requestControlApprovalRevisionForTeam(ctx.prisma, {
          teamId: ctx.teamId,
          approvalId: input.approvalId,
          decidedByUserId: ctx.session.user.id,
          decisionNote: input.decisionNote,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  addComment: withActiveTeam
    .input(
      z.object({
        approvalId: z.string().min(1),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await addControlApprovalCommentForTeam(ctx.prisma, {
          teamId: ctx.teamId,
          approvalId: input.approvalId,
          body: input.body,
          authorUserId: ctx.session.user.id,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  linkIssue: withActiveTeam
    .input(
      z.object({
        approvalId: z.string().min(1),
        issueId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await linkControlIssueToApprovalForTeam(ctx.prisma, {
          teamId: ctx.teamId,
          issueId: input.issueId,
          approvalId: input.approvalId,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),
});
