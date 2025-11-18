import {
  listUserOrganizations,
  updateActiveOrganizationForUser,
} from "@openplane/db/queries/organizations";
import { z } from "zod";
import { protectedProcedure } from "..";
import { createTRPCRouter } from "../index";
import { generateUniqueSlug } from "../utils/slug";

export const organizationRouter = createTRPCRouter({
  generateSlug: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Organization name is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = await generateUniqueSlug(ctx.prisma, input.name);

      return { slug };
    }),

  list: protectedProcedure.query(({ ctx }) => {
    const userId = ctx.session.user.id;

    return listUserOrganizations(ctx.prisma, userId);
  }),

  update: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1, "Organization ID is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      await updateActiveOrganizationForUser(
        ctx.prisma,
        userId,
        input.organizationId
      );

      return { success: true };
    }),
});
