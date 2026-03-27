import { z } from "zod";

export const MemoryCategorySchema = z.enum([
  "profile",
  "preferences",
  "entities",
  "events",
  "cases",
  "patterns",
  "tools",
  "skills",
]);

export type MemoryCategory = z.infer<typeof MemoryCategorySchema>;

export const MemoryExtractionResultSchema = z.object({
  sessionId: z.string(),
  teamId: z.string(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  categories: z.record(z.string(), z.number()).nullable(),
  createdAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
});

export type MemoryExtractionResult = z.infer<
  typeof MemoryExtractionResultSchema
>;

export const MemoryDeduplicationDecisionSchema = z.enum([
  "skip",
  "create",
  "merge",
  "delete",
]);

export type MemoryDeduplicationDecision = z.infer<
  typeof MemoryDeduplicationDecisionSchema
>;

export const CandidateMemorySchema = z.object({
  category: MemoryCategorySchema,
  scope: z.enum(["user", "agent"]),
  abstractText: z.string(),
  content: z.string(),
  uri: z.string(),
});

export type CandidateMemory = z.infer<typeof CandidateMemorySchema>;
