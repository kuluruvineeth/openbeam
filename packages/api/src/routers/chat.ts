/**
 * Chat Router
 * Internal tRPC routes for conversations and AI assistants
 *
 * Uses @openplane/services for all business logic
 */

import {
  archiveConversationById,
  createAssistant,
  createConversation,
  deleteAssistant,
  deleteConversation,
  getAssistant,
  getConversation,
  listAssistants,
  listConversations,
  sendMessage,
  updateAssistant,
  updateTitle,
} from "@openplane/services";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "..";

// ============================================================================
// Input Schemas
// ============================================================================

const listConversationsSchema = z.object({
  assistantId: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

const createConversationSchema = z.object({
  assistantId: z.string().optional(),
  title: z.string().optional(),
  message: z.string().min(1),
});

const sendMessageSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1),
});

const updateTitleSchema = z.object({
  conversationId: z.string(),
  title: z.string().min(1).max(200),
});

const messageFeedbackSchema = z.object({
  messageId: z.string(),
  feedback: z.enum(["positive", "negative"]),
  comment: z.string().optional(),
});

const listAssistantsSchema = z.object({
  visibility: z.enum(["private", "team", "public"]).optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

const createAssistantSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().min(10),
  personality: z.string().optional(),
  instructions: z.string().optional(),
  connectorIds: z.array(z.string()).default([]),
  documentTypes: z.array(z.string()).default([]),
  modelConfig: z
    .object({
      model: z.string().default("gpt-4"),
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().min(100).max(8192).default(4096),
    })
    .default({
      model: "gpt-4",
      temperature: 0.7,
      maxTokens: 4096,
    }),
  examplePrompts: z.array(z.string()).default([]),
  visibility: z.enum(["private", "team", "public"]).default("private"),
  avatar: z.string().url().optional(),
});

const updateAssistantSchema = z.object({
  assistantId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().min(10).optional(),
  personality: z.string().optional(),
  instructions: z.string().optional(),
  connectorIds: z.array(z.string()).optional(),
  documentTypes: z.array(z.string()).optional(),
  modelConfig: z
    .object({
      model: z.string(),
      temperature: z.number().min(0).max(2),
      maxTokens: z.number().min(100).max(8192),
    })
    .optional(),
  examplePrompts: z.array(z.string()).optional(),
  visibility: z.enum(["private", "team", "public"]).optional(),
  avatar: z.string().url().optional(),
});

// ============================================================================
// Helper
// ============================================================================

function getAccessControlIds(session: {
  user: { id: string; email?: string | null };
}): string[] {
  return [session.user.id, session.user.email].filter(Boolean) as string[];
}

// ============================================================================
// Router
// ============================================================================

export const chatRouter = createTRPCRouter({
  // ============================================================================
  // Conversations
  // ============================================================================

  listConversations: protectedProcedure
    .input(listConversationsSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await listConversations(teamId, userId, {
        assistantId: input.assistantId,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  getConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const conversation = await getConversation(
        input.conversationId,
        teamId,
        userId
      );

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      return conversation;
    }),

  createConversation: protectedProcedure
    .input(createConversationSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await createConversation({
        teamId,
        userId,
        assistantId: input.assistantId,
        title: input.title,
        message: input.message,
        accessControlIds: getAccessControlIds(ctx.session),
      });
    }),

  sendMessage: protectedProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const result = await sendMessage({
        conversationId: input.conversationId,
        teamId,
        userId,
        content: input.content,
        accessControlIds: getAccessControlIds(ctx.session),
      });

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      return result;
    }),

  updateTitle: protectedProcedure
    .input(updateTitleSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const success = await updateTitle(
        input.conversationId,
        teamId,
        userId,
        input.title
      );

      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      return { success: true };
    }),

  archiveConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const success = await archiveConversationById(
        input.conversationId,
        teamId,
        userId
      );

      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      return { success: true };
    }),

  deleteConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const success = await deleteConversation(
        input.conversationId,
        teamId,
        userId
      );

      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      return { success: true };
    }),

  provideFeedback: protectedProcedure
    .input(messageFeedbackSchema)
    .mutation(async ({ ctx, input }) => {
      // Record feedback using analytics service
      const { recordFeedback } = await import("@openplane/services");

      const teamId = ctx.session.user.teamId;
      const userId = ctx.session.user.id;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      await recordFeedback({
        teamId,
        userId,
        type: "ai_answer",
        sentiment: input.feedback === "positive" ? "positive" : "negative",
        comment: input.comment,
      });

      return { success: true };
    }),

  // ============================================================================
  // Assistants
  // ============================================================================

  listAssistants: protectedProcedure
    .input(listAssistantsSchema)
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await listAssistants(teamId, {
        visibility: input.visibility,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  getAssistant: protectedProcedure
    .input(z.object({ assistantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const assistant = await getAssistant(input.assistantId, teamId);

      if (!assistant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assistant not found",
        });
      }

      return assistant;
    }),

  createAssistant: protectedProcedure
    .input(createAssistantSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      return await createAssistant(teamId, userId, input);
    }),

  updateAssistant: protectedProcedure
    .input(updateAssistantSchema)
    .mutation(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const { assistantId, ...updates } = input;
      const result = await updateAssistant(assistantId, teamId, updates);

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assistant not found or unauthorized",
        });
      }

      return result;
    }),

  deleteAssistant: protectedProcedure
    .input(z.object({ assistantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;

      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team ID required",
        });
      }

      const success = await deleteAssistant(input.assistantId, teamId);

      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assistant not found or unauthorized",
        });
      }

      return { success: true };
    }),
});
