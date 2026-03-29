import { updateApiKey } from "@openbeam/db";
import {
  createTeamApiKeyForActor,
  listTeamApiKeysForActor,
  revokeTeamApiKeyForActor,
  TeamApiKeyError,
} from "@openbeam/services/api-keys";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "..";
import { createTRPCRouter } from "../index";

function mapServiceError(err: unknown): never {
  if (err instanceof TeamApiKeyError) {
    const codeMap: Record<string, "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND"> =
      {
        UNAUTHORIZED: "UNAUTHORIZED",
        FORBIDDEN: "FORBIDDEN",
        NOT_FOUND: "NOT_FOUND",
      };
    throw new TRPCError({
      code: codeMap[err.code] ?? "INTERNAL_SERVER_ERROR",
      message: err.message,
    });
  }
  throw err;
}

export const apiKeysRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const teamId = ctx.session.user.teamId;
    if (!teamId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No active team" });
    }
    try {
      return await listTeamApiKeysForActor(ctx.prisma, {
        actor: { type: "session", userId: ctx.session.user.id },
        teamId,
      });
    } catch (err) {
      mapServiceError(err);
    }
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        scopes: z.array(z.string()).optional(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;
      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active team",
        });
      }
      try {
        return await createTeamApiKeyForActor(ctx.prisma, {
          actor: { type: "session", userId: ctx.session.user.id },
          teamId,
          name: input.name,
          scopes: input.scopes,
          expiresAt: input.expiresAt,
        });
      } catch (err) {
        mapServiceError(err);
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        scopes: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;
      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active team",
        });
      }
      return await updateApiKey(ctx.prisma, {
        id: input.id,
        teamId,
        name: input.name,
        scopes: input.scopes,
      });
    }),

  revoke: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;
      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active team",
        });
      }
      try {
        await revokeTeamApiKeyForActor(ctx.prisma, {
          actor: { type: "session", userId: ctx.session.user.id },
          teamId,
          apiKeyId: input.id,
        });
        return { success: true };
      } catch (err) {
        mapServiceError(err);
      }
    }),
});
