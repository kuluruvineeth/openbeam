import { z } from "zod";

export const KnowledgeInferenceInputSchema = z.object({
  teamId: z.string(),
  inferenceType: z.enum(["daily", "weekly"]),
  sinceTimestamp: z.number().optional(),
  decayHalfLifeDays: z.number().optional().default(30),
  coOccurrenceThreshold: z.number().optional().default(3),
  confidenceThreshold: z.number().optional().default(0.6),
  includePatternDetection: z.boolean().optional().default(false),
  remainingTeamIds: z.array(z.string()).optional(),
  resumeOffset: z.number().optional(),
  phase: z.enum(["aggregate", "finalize"]).optional().default("aggregate"),
});

export type KnowledgeInferenceInput = z.infer<
  typeof KnowledgeInferenceInputSchema
>;

export const KnowledgeInferenceOutputSchema = z.object({
  teamId: z.string(),
  entitiesProcessed: z.number(),
  edgesCreated: z.number(),
  patternsDetected: z.number(),
  scoresDecayed: z.number(),
});

export type KnowledgeInferenceOutput = z.infer<
  typeof KnowledgeInferenceOutputSchema
>;
