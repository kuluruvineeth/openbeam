import {
  countVoiceNotes,
  createVoiceNote,
  createVoiceSession,
  deleteVoiceNote,
  endVoiceSession,
  findActiveVoiceSession,
  findVoiceNoteById,
  findVoiceSettings,
  getVoiceSessionStats,
  listVoiceNotes,
  listVoiceSessions,
  upsertVoiceSettings,
} from "@openbeam/db";
import {
  CreateVoiceNoteInputSchema,
  ListVoiceNotesInputSchema,
  UpdateVoiceSettingsInputSchema,
  VoiceRoomType,
} from "@openbeam/types/services/voice";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

export const voiceRouter = createTRPCRouter({
  listNotes: withActiveTeam
    .input(ListVoiceNotesInputSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [notes, total] = await Promise.all([
        listVoiceNotes(ctx.prisma, userId, ctx.teamId, {
          limit: input.limit,
          cursor: input.cursor,
          search: input.search,
        }),
        countVoiceNotes(ctx.prisma, userId, ctx.teamId),
      ]);

      const nextCursor =
        notes.length === input.limit ? notes.at(-1)?.id : undefined;

      return { notes, total, nextCursor };
    }),

  getNote: withActiveTeam
    .input(z.object({ noteId: z.string() }))
    .query(async ({ ctx, input }) => {
      const note = await findVoiceNoteById(
        ctx.prisma,
        input.noteId,
        ctx.session.user.id,
        ctx.teamId
      );

      if (!note) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voice note not found",
        });
      }

      return note;
    }),

  createNote: withActiveTeam
    .input(CreateVoiceNoteInputSchema)
    .mutation(async ({ ctx, input }) =>
      createVoiceNote(ctx.prisma, {
        userId: ctx.session.user.id,
        teamId: ctx.teamId,
        text: input.text,
        audioUrl: input.audioUrl,
        duration: input.duration,
        context: input.context,
        tags: input.tags,
      })
    ),

  deleteNote: withActiveTeam
    .input(z.object({ noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await deleteVoiceNote(
        ctx.prisma,
        input.noteId,
        ctx.session.user.id,
        ctx.teamId
      );

      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voice note not found",
        });
      }

      return { success: true };
    }),

  getSettings: withActiveTeam.query(async ({ ctx }) => {
    const settings = await findVoiceSettings(ctx.prisma, ctx.session.user.id);

    if (settings) {
      return settings;
    }

    return {
      id: "",
      userId: ctx.session.user.id,
      engine: "cloud",
      model: "base.en",
      language: "en",
      formatting: true,
      formatStyle: "context-aware",
      shortcuts: {
        dictation: "ctrl+space",
        action: "ctrl+space",
        voiceNotes: "mod+shift+n",
        cancel: "escape",
      },
      vocabulary: [] as string[],
      widgetPosition: "bottom-center",
      widgetOpacity: 0.7,
      autoHide: false,
      updatedAt: new Date(),
    };
  }),

  updateSettings: withActiveTeam
    .input(UpdateVoiceSettingsInputSchema)
    .mutation(async ({ ctx, input }) =>
      upsertVoiceSettings(ctx.prisma, ctx.session.user.id, {
        engine: input.engine,
        model: input.model,
        language: input.language,
        formatting: input.formatting,
        formatStyle: input.formatStyle,
        shortcuts: input.shortcuts,
        vocabulary: input.vocabulary,
        widgetPosition: input.widgetPosition,
        widgetOpacity: input.widgetOpacity,
        autoHide: input.autoHide,
      })
    ),

  getToken: withActiveTeam
    .input(z.object({ roomType: VoiceRoomType }))
    .mutation(async ({ ctx, input }) => {
      const apiKey = process.env.LIVEKIT_API_KEY;
      const apiSecret = process.env.LIVEKIT_API_SECRET;
      const wsUrl = process.env.LIVEKIT_WS_URL;

      if (!(apiKey && apiSecret && wsUrl)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Voice service not configured",
        });
      }

      const { AccessToken } = await import("livekit-server-sdk");
      const userId = ctx.session.user.id;
      const roomName = `${ctx.teamId}-${userId}-${input.roomType}-${Date.now()}`;

      const token = new AccessToken(apiKey, apiSecret, {
        identity: userId,
        ttl: "1h",
      });
      token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
      });

      const session = await createVoiceSession(ctx.prisma, {
        userId,
        teamId: ctx.teamId,
        roomType: input.roomType,
        roomName,
      });

      return {
        token: await token.toJwt(),
        wsUrl,
        sessionId: session.id,
        roomName,
      };
    }),

  getActiveSession: withActiveTeam.query(async ({ ctx }) =>
    findActiveVoiceSession(ctx.prisma, ctx.session.user.id, ctx.teamId)
  ),

  endSession: withActiveTeam
    .input(
      z.object({
        sessionId: z.string(),
        duration: z.number().int().min(0),
        wordsSpoken: z.number().int().min(0),
        toolCalls: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) =>
      endVoiceSession(ctx.prisma, input.sessionId, {
        duration: input.duration,
        wordsSpoken: input.wordsSpoken,
        toolCalls: input.toolCalls,
      })
    ),

  listSessions: withActiveTeam
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) =>
      listVoiceSessions(ctx.prisma, ctx.session.user.id, ctx.teamId, {
        limit: input.limit,
        offset: input.offset,
      })
    ),

  getStats: withActiveTeam
    .input(
      z.object({
        since: z.coerce.date().default(() => {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          return d;
        }),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await getVoiceSessionStats(
        ctx.prisma,
        ctx.session.user.id,
        ctx.teamId,
        input.since
      );

      return {
        sessionCount: result._count,
        totalDuration: result._sum.duration ?? 0,
        totalWordsSpoken: result._sum.wordsSpoken ?? 0,
        totalToolCalls: result._sum.toolCalls ?? 0,
      };
    }),
});
