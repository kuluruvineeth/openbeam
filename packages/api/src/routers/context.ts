import { createHash } from "node:crypto";
import { completionService } from "@openbeam/ai";
import {
  addContextSessionMessage,
  createContextRelation,
  createContextSession,
  deleteContextEntry,
  deleteContextRelation,
  findContextEntry,
  findContextRelations,
  findContextSession,
  listContextChildren,
  listContextSessions,
  updateContextSessionStatus,
  updateContextSessionTokens,
  upsertContextEntry,
} from "@openbeam/db";
import { ContextSearchService, getContextAnalytics } from "@openbeam/services";
import {
  CreateContextEntrySchema,
  UpdateContextEntrySchema,
} from "@openbeam/types/context";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

let _searchService: ContextSearchService | null = null;
function getSearchService(): ContextSearchService {
  _searchService ??= new ContextSearchService(completionService);
  return _searchService;
}

function contextEntryId(teamId: string, uri: string): string {
  return createHash("md5").update(`${teamId}:${uri}`).digest("hex");
}

export const contextRouter = createTRPCRouter({
  get: withActiveTeam
    .input(z.object({ uri: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const entry = await findContextEntry(ctx.prisma, ctx.teamId, input.uri);

      if (!entry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Context entry not found",
        });
      }

      return entry;
    }),

  list: withActiveTeam
    .input(
      z.object({
        parentUri: z.string().min(1),
        limit: z.number().min(1).max(200).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const entries = await listContextChildren(
        ctx.prisma,
        ctx.teamId,
        input.parentUri
      );
      return entries.slice(0, input.limit);
    }),

  create: withActiveTeam
    .input(CreateContextEntrySchema)
    .mutation(({ ctx, input }) => {
      const id = contextEntryId(ctx.teamId, input.uri);
      return upsertContextEntry(ctx.prisma, {
        id,
        uri: input.uri,
        parentUri: input.parentUri ?? undefined,
        teamId: ctx.teamId,
        ownerId: input.ownerId,
        ownerType: input.ownerType,
        contextType: input.contextType,
        category: input.category ?? undefined,
        isLeaf: input.isLeaf,
        abstractText: input.abstractText,
        overview: input.overview ?? undefined,
        content: input.content ?? undefined,
      });
    }),

  update: withActiveTeam
    .input(
      z.object({
        uri: z.string().min(1),
        data: UpdateContextEntrySchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await findContextEntry(
        ctx.prisma,
        ctx.teamId,
        input.uri
      );

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Context entry not found",
        });
      }

      return upsertContextEntry(ctx.prisma, {
        id: existing.id,
        uri: existing.uri,
        parentUri: existing.parentUri ?? undefined,
        teamId: ctx.teamId,
        ownerId: existing.ownerId,
        ownerType: existing.ownerType,
        contextType: existing.contextType,
        category: input.data.category ?? existing.category ?? undefined,
        isLeaf: input.data.isLeaf ?? existing.isLeaf,
        abstractText: input.data.abstractText ?? existing.abstractText,
        overview: input.data.overview ?? existing.overview ?? undefined,
        content: input.data.content ?? existing.content ?? undefined,
      });
    }),

  delete: withActiveTeam
    .input(z.object({ uri: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await findContextEntry(
        ctx.prisma,
        ctx.teamId,
        input.uri
      );

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Context entry not found",
        });
      }

      await deleteContextEntry(ctx.prisma, ctx.teamId, input.uri);
      return { success: true };
    }),

  search: withActiveTeam
    .input(
      z.object({
        query: z.string().min(1),
        contextType: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(({ ctx, input }) => {
      const searchService = getSearchService();
      return searchService.find(input.query, ctx.teamId, {
        contextType: input.contextType as
          | "resource"
          | "memory"
          | "skill"
          | "tool"
          | undefined,
        limit: input.limit,
      });
    }),

  find: withActiveTeam
    .input(
      z.object({
        query: z.string().min(1),
        scope: z.string().optional(),
        contextType: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(({ ctx, input }) => {
      const searchService = getSearchService();
      return searchService.find(input.query, ctx.teamId, {
        contextType: input.contextType as
          | "resource"
          | "memory"
          | "skill"
          | "tool"
          | undefined,
        limit: input.limit,
      });
    }),

  createSession: withActiveTeam
    .input(z.object({ agentId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const session = await createContextSession(ctx.prisma, {
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
        agentId: input.agentId,
      });

      return session;
    }),

  addMessage: withActiveTeam
    .input(
      z.object({
        sessionId: z.string().min(1),
        role: z.enum(["user", "assistant", "tool", "system"]),
        content: z.string().min(1),
        parts: z.unknown().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await findContextSession(ctx.prisma, input.sessionId);

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      if (session.teamId !== ctx.teamId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      const tokenEstimate = Math.ceil(input.content.length / 4);

      const message = await addContextSessionMessage(ctx.prisma, {
        sessionId: input.sessionId,
        role: input.role,
        content: input.content,
        parts: input.parts,
        tokenCount: tokenEstimate,
      });

      await updateContextSessionTokens(
        ctx.prisma,
        input.sessionId,
        session.totalTokens + tokenEstimate
      );

      return message;
    }),

  commitSession: withActiveTeam
    .input(z.object({ sessionId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const session = await findContextSession(ctx.prisma, input.sessionId);

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      if (session.teamId !== ctx.teamId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      const updated = await updateContextSessionStatus(
        ctx.prisma,
        input.sessionId,
        "committed"
      );

      return updated;
    }),

  listSessions: withActiveTeam
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      const sessions = await listContextSessions(
        ctx.prisma,
        ctx.teamId,
        ctx.session.user.id,
        input.limit
      );

      return sessions;
    }),

  link: withActiveTeam
    .input(
      z.object({
        sourceUri: z.string().min(1),
        targetUri: z.string().min(1),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const relation = await createContextRelation(ctx.prisma, {
        sourceUri: input.sourceUri,
        targetUri: input.targetUri,
        teamId: ctx.teamId,
        reason: input.reason,
      });

      return relation;
    }),

  unlink: withActiveTeam
    .input(
      z.object({
        sourceUri: z.string().min(1),
        targetUri: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await deleteContextRelation(
        ctx.prisma,
        ctx.teamId,
        input.sourceUri,
        input.targetUri
      );

      return { success: true };
    }),

  relations: withActiveTeam
    .input(
      z.object({
        uri: z.string().min(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const relations = await findContextRelations(
        ctx.prisma,
        ctx.teamId,
        input.uri
      );

      return relations.slice(0, input.limit);
    }),

  analytics: withActiveTeam.query(async ({ ctx }) =>
    getContextAnalytics(ctx.prisma, ctx.teamId)
  ),
});
