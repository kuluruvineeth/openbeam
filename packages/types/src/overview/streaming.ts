import { z } from "zod";
import {
  OverviewCitationSchema,
  OverviewTimingSchema,
  OverviewUsageSchema,
} from "./response";

export const OverviewStreamChunkTypeSchema = z.enum([
  "thinking",
  "tool_call",
  "tool_result",
  "text",
  "citation",
  "done",
  "error",
]);

export type OverviewStreamChunkType = z.infer<
  typeof OverviewStreamChunkTypeSchema
>;

export const OverviewToolCallDataSchema = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  toolInput: z.unknown().optional(),
});

export type OverviewToolCallData = z.infer<typeof OverviewToolCallDataSchema>;

export const OverviewToolResultDataSchema = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  toolOutput: z.unknown().optional(),
});

export type OverviewToolResultData = z.infer<
  typeof OverviewToolResultDataSchema
>;

export const OverviewStreamChunkSchema = z.object({
  type: OverviewStreamChunkTypeSchema,
  content: z.string().optional(),
  citation: OverviewCitationSchema.optional(),
  usage: OverviewUsageSchema.optional(),
  timing: OverviewTimingSchema.optional(),
  groundingScore: z.number().optional(),
  error: z.string().optional(),
  toolCall: OverviewToolCallDataSchema.optional(),
  toolResult: OverviewToolResultDataSchema.optional(),
});

export type OverviewStreamChunk = z.infer<typeof OverviewStreamChunkSchema>;
