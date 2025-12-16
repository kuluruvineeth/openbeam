import { z } from "zod";

export const DigestFrequencySchema = z.enum(["daily", "weekly"]);

export type DigestFrequency = z.infer<typeof DigestFrequencySchema>;

export const DigestConfigSchema = z.object({
  userId: z.string(),
  slackUserId: z.string(),
  teamId: z.string(),
  connectorId: z.string(),
  channelIds: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  deliveryTime: z.string().default("09:00"),
  timezone: z.string().default("UTC"),
  frequency: DigestFrequencySchema.default("daily"),
  accessControlIds: z.array(z.string()).default([]),
});

export type DigestConfig = z.infer<typeof DigestConfigSchema>;

export const HighlightTypeSchema = z.enum([
  "decision",
  "announcement",
  "action_item",
  "discussion",
]);

export type HighlightType = z.infer<typeof HighlightTypeSchema>;

export interface DigestHighlight {
  type: HighlightType;
  content: string;
  channel?: string;
  url?: string;
}

export interface DigestContent {
  summary: string;
  highlights: DigestHighlight[];
  messageCount: number;
  channelCount: number;
  generatedAt: Date;
}

export interface DigestDeliveryResult {
  success: boolean;
  messageTs?: string;
  error?: string;
}
