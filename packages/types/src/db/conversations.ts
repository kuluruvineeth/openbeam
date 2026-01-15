import { z } from "zod";
import { ConversationRoleSchema } from "../ai/rag";

export const CreateConversationDataSchema = z.object({
  userId: z.string(),
  teamId: z.string(),
  title: z.string().optional(),
});

export type CreateConversationData = z.infer<
  typeof CreateConversationDataSchema
>;

export const AddConversationMessageDataSchema = z.object({
  role: ConversationRoleSchema,
  content: z.string(),
  citations: z.array(z.unknown()).optional(),
  contextDocIds: z.array(z.string()).optional(),
  groundingScore: z.number().optional(),
  confidence: z.string().optional(),
  promptTokens: z.number().int().optional(),
  completionTokens: z.number().int().optional(),
  latencyMs: z.number().int().optional(),
  firstTokenMs: z.number().int().optional(),
});

export type AddConversationMessageData = z.infer<
  typeof AddConversationMessageDataSchema
>;

export const ConversationListOptionsSchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
});

export type ConversationListOptions = z.infer<
  typeof ConversationListOptionsSchema
>;

export const ConversationListItemSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  messageCount: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ConversationListItem = z.infer<typeof ConversationListItemSchema>;
