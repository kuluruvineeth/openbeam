import {
  countTeamOwners,
  getTeamMembership,
  listTeamMembers,
  removeTeamMember,
  updateTeamMemberRole,
} from "@openbeam/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { withAdminRole } from "../apps/middleware";

export const adminMembersRouter = createTRPCRouter({
  list: withAdminRole.query(({ ctx }) =>
    listTeamMembers(ctx.prisma, ctx.teamId)
  ),

  updateRole: withAdminRole
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["ADMIN", "MEMBER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change your own role",
        });
      }

      const target = await getTeamMembership(
        ctx.prisma,
        input.userId,
        ctx.teamId
      );

      if (target?.role === "OWNER") {
        const owners = await countTeamOwners(ctx.prisma, ctx.teamId);
        if (owners <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot demote the last owner",
          });
        }
      }

      return updateTeamMemberRole(
        ctx.prisma,
        input.userId,
        ctx.teamId,
        input.role
      );
    }),

  remove: withAdminRole
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove yourself",
        });
      }

      const target = await getTeamMembership(
        ctx.prisma,
        input.userId,
        ctx.teamId
      );

      if (target?.role === "OWNER") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove an owner",
        });
      }

      return removeTeamMember(ctx.prisma, input.userId, ctx.teamId);
    }),
});
