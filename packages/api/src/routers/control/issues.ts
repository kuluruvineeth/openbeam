import {
  addControlIssueCommentForTeam,
  assignControlIssueLabelForTeam,
  checkoutControlIssueForTeam,
  countControlIssuesForTeam,
  createControlIssueForTeam,
  createControlIssueLabelForTeam,
  getControlIssueForTeam,
  getIssueAncestors,
  hideControlIssueForTeam,
  listControlIssueCommentsForTeam,
  listControlIssueLabelsForTeam,
  listControlIssuesForTeam,
  releaseControlIssueForTeam,
  removeControlIssueLabelForTeam,
  updateControlIssueForTeam,
} from "@openbeam/services";
import {
  AddControlIssueCommentInputSchema,
  CreateControlIssueInputSchema,
  CreateControlIssueLabelInputSchema,
} from "@openbeam/types/control/validators/issues";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { withActiveTeam } from "../apps/middleware";
import { mapControlError } from "./middleware";

export const issuesRouter = createTRPCRouter({
  list: withActiveTeam
    .input(
      z.object({
        status: z.string().optional(),
        assigneeAgentId: z.string().optional(),
        projectId: z.string().optional(),
        parentId: z.string().optional(),
        limit: z.number().int().positive().optional(),
        offset: z.number().int().nonnegative().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listControlIssuesForTeam(ctx.prisma, ctx.teamId, {
          status: input.status,
          assigneeAgentId: input.assigneeAgentId,
          projectId: input.projectId,
          parentId: input.parentId,
          limit: input.limit,
          offset: input.offset,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  get: withActiveTeam
    .input(z.object({ issueId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await getControlIssueForTeam(
          ctx.prisma,
          ctx.teamId,
          input.issueId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  getWithAncestors: withActiveTeam
    .input(z.object({ issueId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        const issue = await getControlIssueForTeam(
          ctx.prisma,
          ctx.teamId,
          input.issueId
        );
        const ancestors = await getIssueAncestors(
          ctx.prisma,
          ctx.teamId,
          input.issueId
        );
        return { issue, ancestors };
      } catch (err) {
        mapControlError(err);
      }
    }),

  create: withActiveTeam
    .input(CreateControlIssueInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createControlIssueForTeam(ctx.prisma, ctx.teamId, input);
      } catch (err) {
        mapControlError(err);
      }
    }),

  update: withActiveTeam
    .input(
      z.object({
        issueId: z.string().min(1),
        data: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateControlIssueForTeam(
          ctx.prisma,
          ctx.teamId,
          input.issueId,
          input.data
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  hide: withActiveTeam
    .input(z.object({ issueId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await hideControlIssueForTeam(
          ctx.prisma,
          ctx.teamId,
          input.issueId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  checkout: withActiveTeam
    .input(
      z.object({
        issueId: z.string().min(1),
        runId: z.string().min(1),
        agentNameKey: z.string().min(1),
        expectedStatuses: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await checkoutControlIssueForTeam(ctx.prisma, {
          teamId: ctx.teamId,
          issueId: input.issueId,
          runId: input.runId,
          agentNameKey: input.agentNameKey,
          expectedStatuses: input.expectedStatuses,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  release: withActiveTeam
    .input(z.object({ issueId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await releaseControlIssueForTeam(
          ctx.prisma,
          ctx.teamId,
          input.issueId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  count: withActiveTeam
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        return await countControlIssuesForTeam(
          ctx.prisma,
          ctx.teamId,
          input.status
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  listComments: withActiveTeam
    .input(z.object({ issueId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await listControlIssueCommentsForTeam(
          ctx.prisma,
          ctx.teamId,
          input.issueId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  addComment: withActiveTeam
    .input(
      z
        .object({ issueId: z.string().min(1) })
        .merge(AddControlIssueCommentInputSchema)
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await addControlIssueCommentForTeam(ctx.prisma, {
          teamId: ctx.teamId,
          issueId: input.issueId,
          body: input.body,
          authorUserId: ctx.session.user.id,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  listLabels: withActiveTeam.query(async ({ ctx }) => {
    try {
      return await listControlIssueLabelsForTeam(ctx.prisma, ctx.teamId);
    } catch (err) {
      mapControlError(err);
    }
  }),

  createLabel: withActiveTeam
    .input(CreateControlIssueLabelInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createControlIssueLabelForTeam(ctx.prisma, ctx.teamId, {
          name: input.name,
          color: input.color,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  assignLabel: withActiveTeam
    .input(
      z.object({
        issueId: z.string().min(1),
        labelId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await assignControlIssueLabelForTeam(ctx.prisma, {
          teamId: ctx.teamId,
          issueId: input.issueId,
          labelId: input.labelId,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  removeLabel: withActiveTeam
    .input(
      z.object({
        issueId: z.string().min(1),
        labelId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeControlIssueLabelForTeam(
          ctx.prisma,
          input.issueId,
          input.labelId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),
});
