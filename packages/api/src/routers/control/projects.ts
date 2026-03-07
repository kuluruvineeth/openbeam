import {
  addControlProjectWorkspaceForTeam,
  archiveControlProjectForTeam,
  createControlProjectForTeam,
  getControlProjectForTeam,
  linkControlProjectGoalForTeam,
  listControlProjectsForTeam,
  unlinkControlProjectGoalForTeam,
  updateControlProjectForTeam,
} from "@openbeam/services";
import { CreateControlProjectInputSchema } from "@openbeam/types/control/validators/projects";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { withActiveTeam } from "../apps/middleware";
import { mapControlError } from "./middleware";

export const projectsRouter = createTRPCRouter({
  list: withActiveTeam
    .input(
      z.object({
        limit: z.number().int().positive().optional(),
        offset: z.number().int().nonnegative().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listControlProjectsForTeam(ctx.prisma, ctx.teamId, {
          limit: input.limit,
          offset: input.offset,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  get: withActiveTeam
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await getControlProjectForTeam(
          ctx.prisma,
          ctx.teamId,
          input.projectId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  create: withActiveTeam
    .input(CreateControlProjectInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createControlProjectForTeam(ctx.prisma, ctx.teamId, input);
      } catch (err) {
        mapControlError(err);
      }
    }),

  update: withActiveTeam
    .input(
      z.object({
        projectId: z.string().min(1),
        data: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateControlProjectForTeam(
          ctx.prisma,
          ctx.teamId,
          input.projectId,
          input.data
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  archive: withActiveTeam
    .input(z.object({ projectId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await archiveControlProjectForTeam(
          ctx.prisma,
          ctx.teamId,
          input.projectId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  addWorkspace: withActiveTeam
    .input(
      z.object({
        projectId: z.string().min(1),
        name: z.string().min(1),
        cwd: z.string().optional(),
        repoUrl: z.string().optional(),
        repoRef: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await addControlProjectWorkspaceForTeam(ctx.prisma, {
          teamId: ctx.teamId,
          projectId: input.projectId,
          name: input.name,
          cwd: input.cwd,
          repoUrl: input.repoUrl,
          repoRef: input.repoRef,
          metadata: input.metadata,
          isPrimary: input.isPrimary,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  linkGoal: withActiveTeam
    .input(
      z.object({
        projectId: z.string().min(1),
        goalId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await linkControlProjectGoalForTeam(ctx.prisma, {
          teamId: ctx.teamId,
          projectId: input.projectId,
          goalId: input.goalId,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  unlinkGoal: withActiveTeam
    .input(
      z.object({
        projectId: z.string().min(1),
        goalId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await unlinkControlProjectGoalForTeam(
          ctx.prisma,
          input.projectId,
          input.goalId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),
});
