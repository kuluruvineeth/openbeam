import { findBotLinkRequest, linkBotAccount } from "@openbeam/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "..";
import { createTRPCRouter } from "../index";

export const botRouter = createTRPCRouter({
  verifyLinkToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const request = await findBotLinkRequest(ctx.prisma, input.token);

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid link token",
        });
      }
      if (request.consumed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Token already used",
        });
      }
      if (request.expiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Token expired" });
      }

      return {
        platform: request.platform,
        platformUserId: request.platformUserId,
        expiresAt: request.expiresAt,
      };
    }),

  linkAccount: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { userLink } = await linkBotAccount(
        ctx.prisma,
        input.token,
        ctx.session.user.teamId,
        ctx.session.user.id
      );

      return {
        platform: userLink.platform,
        platformUserId: userLink.platformUserId,
        linked: true,
      };
    }),
});
