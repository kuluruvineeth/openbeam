import {
  archiveConversation,
  countConversations,
  createConversation,
  deleteConversation,
  findConversationWithMessages,
  listConversations,
  updateRAGInteractionFeedback,
} from "@openplane/db";
import {
  type ConversationContext,
  getConversationManager,
  getRAGOrchestrator,
  type RAGRequest,
} from "@openplane/services";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

function buildAccessControlIds(ctx: {
  teamId: string;
  session: { user: { id: string; email?: string | null } };
}): string[] {
  return [
    `team:${ctx.teamId}`,
    ctx.session.user.id,
    ctx.session.user.email,
  ].filter(Boolean) as string[];
}

const askInputSchema = z.object({
  query: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
  modelId: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  includeMedia: z.boolean().default(true),
  sourceId: z.string().optional(),
});

const streamInputSchema = z.object({
  query: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
  modelId: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  includeMedia: z.boolean().default(true),
  sourceId: z.string().optional(),
});

const conversationListSchema = z.object({
  status: z.enum(["active", "archived"]).default("active"),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const conversationGetSchema = z.object({
  id: z.string(),
});

const feedbackSchema = z.object({
  interactionId: z.string(),
  feedbackType: z.enum(["helpful", "not_helpful", "incorrect", "incomplete"]),
  feedbackNote: z.string().max(1000).optional(),
});

export const ragRouter = createTRPCRouter({
  ask: withActiveTeam.input(askInputSchema).mutation(async ({ ctx, input }) => {
    const accessControlIds = buildAccessControlIds(ctx);

    const orchestrator = getRAGOrchestrator(ctx.prisma);

    let conversationContext: ConversationContext | null = null;
    if (input.conversationId) {
      const manager = getConversationManager(ctx.prisma);
      conversationContext = await manager.getConversationContext(
        input.conversationId,
        ctx.session.user.id,
        ctx.teamId
      );
    }

    const request: RAGRequest = {
      query: input.query,
      teamId: ctx.teamId,
      userId: ctx.session.user.id,
      conversationId: input.conversationId,
      conversationContext: conversationContext ?? undefined,
      accessControlIds,
      modelId: input.modelId,
      temperature: input.temperature,
      includeMedia: input.includeMedia,
      sourceId: input.sourceId,
    };

    const response = await orchestrator.answer(request);

    return {
      answer: response.answer,
      citations: response.citations,
      grounding: response.grounding,
      conversationId: response.conversationId,
      usage: response.usage,
      timing: response.timing,
    };
  }),

  stream: withActiveTeam
    .input(streamInputSchema)
    .subscription(async function* ({ ctx, input }) {
      const accessControlIds = buildAccessControlIds(ctx);
      const orchestrator = getRAGOrchestrator(ctx.prisma);

      let conversationContext: ConversationContext | null = null;
      if (input.conversationId) {
        const manager = getConversationManager(ctx.prisma);
        conversationContext = await manager.getConversationContext(
          input.conversationId,
          ctx.session.user.id,
          ctx.teamId
        );
      }

      const request: RAGRequest = {
        query: input.query,
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
        conversationId: input.conversationId,
        conversationContext: conversationContext ?? undefined,
        accessControlIds,
        modelId: input.modelId,
        temperature: input.temperature,
        includeMedia: input.includeMedia,
        sourceId: input.sourceId,
      };

      for await (const chunk of orchestrator.stream(request)) {
        yield chunk;
      }
    }),

  createConversation: withActiveTeam.mutation(async ({ ctx }) => {
    const conversation = await createConversation(ctx.prisma, {
      userId: ctx.session.user.id,
      teamId: ctx.teamId,
    });

    return { id: conversation.id };
  }),

  listConversations: withActiveTeam
    .input(conversationListSchema)
    .query(async ({ ctx, input }) => {
      const [conversations, total] = await Promise.all([
        listConversations(ctx.prisma, ctx.session.user.id, ctx.teamId, {
          status: input.status,
          limit: input.limit,
          offset: input.offset,
        }),
        countConversations(
          ctx.prisma,
          ctx.session.user.id,
          ctx.teamId,
          input.status
        ),
      ]);

      const hasMore = input.offset + conversations.length < total;

      return {
        conversations,
        total,
        hasMore,
        nextOffset: hasMore ? input.offset + input.limit : undefined,
      };
    }),

  getConversation: withActiveTeam
    .input(conversationGetSchema)
    .query(async ({ ctx, input }) => {
      const conversation = await findConversationWithMessages(
        ctx.prisma,
        input.id,
        ctx.session.user.id,
        ctx.teamId
      );

      if (!conversation) {
        return null;
      }

      return {
        id: conversation.id,
        title: conversation.title,
        summary: conversation.summary,
        messageCount: conversation.messageCount,
        messages: conversation.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.citations,
          groundingScore: m.groundingScore,
          confidence: m.confidence,
          createdAt: m.createdAt,
        })),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      };
    }),

  archiveConversation: withActiveTeam
    .input(conversationGetSchema)
    .mutation(async ({ ctx, input }) => {
      const conversation = await findConversationWithMessages(
        ctx.prisma,
        input.id,
        ctx.session.user.id,
        ctx.teamId
      );

      if (!conversation) {
        return { success: false };
      }

      await archiveConversation(ctx.prisma, input.id);
      return { success: true };
    }),

  deleteConversation: withActiveTeam
    .input(conversationGetSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await deleteConversation(
        ctx.prisma,
        input.id,
        ctx.session.user.id,
        ctx.teamId
      );

      return { success: result.count > 0 };
    }),

  submitFeedback: withActiveTeam
    .input(feedbackSchema)
    .mutation(async ({ ctx, input }) => {
      await updateRAGInteractionFeedback(
        ctx.prisma,
        input.interactionId,
        input.feedbackType,
        input.feedbackNote
      );

      return { success: true };
    }),
});
