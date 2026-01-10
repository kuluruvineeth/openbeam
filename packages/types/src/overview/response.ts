import { z } from "zod";

export const OverviewCitationSchema = z.object({
  index: z.number(),
  documentId: z.string(),
  title: z.string(),
  url: z.string().optional(),
  snippet: z.string(),
  connectorType: z.string().optional(),
  sourceType: z.enum(["document", "media"]).optional(),
  relevanceScore: z.number().min(0).max(1),
});

export type OverviewCitation = z.infer<typeof OverviewCitationSchema>;

export const OverviewTimingSchema = z.object({
  fanoutMs: z.number(),
  retrievalMs: z.number(),
  contextBuildMs: z.number(),
  generationMs: z.number(),
  totalMs: z.number(),
  firstTokenMs: z.number().nullable(),
});

export type OverviewTiming = z.infer<typeof OverviewTimingSchema>;

export const OverviewUsageSchema = z.object({
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
});

export type OverviewUsage = z.infer<typeof OverviewUsageSchema>;

export const OverviewResponseSchema = z.object({
  content: z.string(),
  citations: z.array(OverviewCitationSchema),
  groundingScore: z.number().nullable(),
  timing: OverviewTimingSchema,
  usage: OverviewUsageSchema,
});

export type OverviewResponse = z.infer<typeof OverviewResponseSchema>;
