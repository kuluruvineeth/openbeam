import { z } from "zod";
import { BotPlatformSchema } from "./platforms";

export const MessageAttachmentSchema = z.object({
  type: z.enum(["file", "image", "link"]),
  url: z.string().optional(),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
});
export type MessageAttachment = z.infer<typeof MessageAttachmentSchema>;

export const InteractionTypeSchema = z.enum([
  "message",
  "button",
  "modal_submit",
  "list_select",
  "callback",
]);
export type InteractionType = z.infer<typeof InteractionTypeSchema>;

export const UnifiedMessageSchema = z.object({
  id: z.string(),
  platform: BotPlatformSchema,
  platformUserId: z.string(),
  platformTeamId: z.string(),
  channelId: z.string(),
  threadId: z.string().optional(),
  text: z.string(),
  command: z.string().optional(),
  attachments: z.array(MessageAttachmentSchema).optional(),
  isDirectMessage: z.boolean(),
  isMention: z.boolean(),
  timestamp: z.date(),
  rawEvent: z.unknown(),
  interactionType: InteractionTypeSchema.optional(),
  interactionData: z.record(z.string(), z.unknown()).optional(),
  callbackQueryId: z.string().optional(),
  callbackMessageId: z.number().optional(),
});
export type UnifiedMessage = z.infer<typeof UnifiedMessageSchema>;

export const BotResponseTypeSchema = z.enum([
  "text",
  "search_results",
  "briefing",
  "answer",
  "expert_list",
  "action_result",
  "error",
  "link_prompt",
]);
export type BotResponseType = z.infer<typeof BotResponseTypeSchema>;

export const SearchResultItemSchema = z.object({
  title: z.string(),
  snippet: z.string(),
  url: z.string().optional(),
  source: z.string(),
  score: z.number(),
});
export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;

export const ExpertItemSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  expertise: z.array(z.string()),
  documentCount: z.number(),
});
export type ExpertItem = z.infer<typeof ExpertItemSchema>;

export const ActionResultItemSchema = z.object({
  action: z.string(),
  success: z.boolean(),
  message: z.string(),
  url: z.string().optional(),
});
export type ActionResultItem = z.infer<typeof ActionResultItemSchema>;

export const CitationSchema = z.object({
  index: z.number(),
  title: z.string(),
  url: z.string().optional(),
  snippet: z.string().optional(),
  source: z.string().optional(),
});
export type Citation = z.infer<typeof CitationSchema>;

export const ResponseButtonSchema = z.object({
  label: z.string(),
  action: z.string(),
  value: z.string(),
  style: z.enum(["primary", "danger", "default"]).optional(),
});
export type ResponseButton = z.infer<typeof ResponseButtonSchema>;

export const BotResponseSchema = z.object({
  type: BotResponseTypeSchema,
  text: z.string(),
  title: z.string().optional(),
  results: z.array(SearchResultItemSchema).optional(),
  experts: z.array(ExpertItemSchema).optional(),
  actionResult: ActionResultItemSchema.optional(),
  citations: z.array(CitationSchema).optional(),
  followUps: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  responseId: z.string().optional(),
  buttons: z.array(ResponseButtonSchema).optional(),
  threadId: z.string().optional(),
  ephemeral: z.boolean().optional(),
});
export type BotResponse = z.infer<typeof BotResponseSchema>;
