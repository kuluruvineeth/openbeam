import {
  listUserTeams,
  updateActiveTeamForUser,
} from "@openplane/db/queries/teams";
import { z } from "zod";
import { protectedProcedure } from "..";
import { createTRPCRouter } from "../index";
import { generateUniqueSlug } from "../utils/slug";

export const teamRouter = createTRPCRouter({
  generateSlug: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Team name is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = await generateUniqueSlug(ctx.prisma, input.name);

      return { slug };
    }),

  list: protectedProcedure.query(({ ctx }) => {
    const userId = ctx.session.user.id;

    return listUserTeams(ctx.prisma, userId);
  }),

  switch: protectedProcedure
    .input(
      z.object({
        teamId: z.string().min(1, "Team ID is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      await updateActiveTeamForUser(ctx.prisma, userId, input.teamId);

      return { success: true };
    }),
});
