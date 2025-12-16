import { z } from "zod";

export const ResponseModeSchema = z.enum([
  "always",
  "confident",
  "mention_only",
  "never",
]);

export type ResponseMode = z.infer<typeof ResponseModeSchema>;

export const CitationSchema = z.object({
  title: z.string(),
  url: z.string().optional(),
  snippet: z.string().optional(),
  documentId: z.string().optional(),
  connectorType: z.string().optional(),
  sourceType: z.enum(["document", "media"]).optional(),
});

export type Citation = z.infer<typeof CitationSchema>;

export const AssistantResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(CitationSchema),
  confidence: z.number().min(0).max(1),
  sources: z.array(z.string()),
  latencyMs: z.number().optional(),
});

export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;

export const QuestionTypeSchema = z.enum([
  "what",
  "how",
  "why",
  "where",
  "when",
  "who",
  "which",
  "general",
]);

export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const QuestionAnalysisSchema = z.object({
  isQuestion: z.boolean(),
  confidence: z.number().min(0).max(1),
  questionType: QuestionTypeSchema.optional(),
  extractedQuery: z.string(),
});

export type QuestionAnalysis = z.infer<typeof QuestionAnalysisSchema>;

export const ReactionStatusSchema = z.enum([
  "suggestion_made",
  "suggestion_shared",
  "not_helpful",
]);

export type ReactionStatus = z.infer<typeof ReactionStatusSchema>;

export const REACTION_EMOJIS: Record<ReactionStatus, string> = {
  suggestion_made: "eyes",
  suggestion_shared: "white_check_mark",
  not_helpful: "thumbsdown",
} as const;

export interface AssistantContext {
  connectorId: string;
  teamId: string;
  channelId: string;
  userId: string;
  threadTs?: string;
  accessControlIds: string[];
  responseMode: ResponseMode;
  reactionsEnabled: boolean;
}

export interface AssistantHandlerResult {
  handled: boolean;
  response?: AssistantResponse;
  error?: Error;
}
