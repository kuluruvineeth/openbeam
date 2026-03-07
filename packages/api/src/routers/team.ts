import {
  createTeam,
  getTeamMembership,
  getUserById,
  listUserTeams,
  updateActiveTeamForUser,
} from "@openbeam/db";
import { TRPCError } from "@trpc/server";
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

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Team name is required"),
        slug: z.string().min(1, "Slug is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const team = await createTeam(ctx.prisma, {
        name: input.name,
        slug: input.slug,
        userId,
      });

      return team;
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

      const membership = await getTeamMembership(
        ctx.prisma,
        userId,
        input.teamId
      );
      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this team",
        });
      }

      await updateActiveTeamForUser(ctx.prisma, userId, input.teamId);

      return { success: true };
    }),

  getUserRole: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.prisma, ctx.session.user.id);
    const teamId = user?.teamId ?? null;

    if (!teamId) {
      return { role: null };
    }

    const membership = await getTeamMembership(
      ctx.prisma,
      ctx.session.user.id,
      teamId
    );
    const role = membership?.role ?? null;

    return { role };
  }),
});
