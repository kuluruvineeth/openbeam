import { z } from "zod";

export const AggregateMentionsInputSchema = z.object({
  teamId: z.string(),
  entityBatchOffset: z.number(),
  batchSize: z.number(),
  sinceTimestamp: z.number().optional(),
});

export type AggregateMentionsInput = z.infer<
  typeof AggregateMentionsInputSchema
>;

export const AggregateMentionsOutputSchema = z.object({
  entityCount: z.number(),
  hasMore: z.boolean(),
  nextOffset: z.number().nullable(),
  summary: z.record(
    z.string(),
    z.object({
      entityId: z.string(),
      mentionCount: z.number(),
      sources: z.array(z.string()),
      lastMentionedAt: z.number(),
    })
  ),
});

export type AggregateMentionsOutput = z.infer<
  typeof AggregateMentionsOutputSchema
>;

export const ComputeExpertiseInputSchema = z.object({
  teamId: z.string(),
  mentionSummary: z.record(z.string(), z.unknown()),
  decayHalfLifeDays: z.number().optional(),
});

export type ComputeExpertiseInput = z.infer<typeof ComputeExpertiseInputSchema>;

export const ComputeExpertiseOutputSchema = z.object({
  scoresUpdated: z.number(),
  topExperts: z.array(
    z.object({
      entityId: z.string(),
      score: z.number(),
      domains: z.array(z.string()),
    })
  ),
});

export type ComputeExpertiseOutput = z.infer<
  typeof ComputeExpertiseOutputSchema
>;

export const InferRelationshipsInputSchema = z.object({
  teamId: z.string(),
  coOccurrenceThreshold: z.number(),
  confidenceThreshold: z.number(),
});

export type InferRelationshipsInput = z.infer<
  typeof InferRelationshipsInputSchema
>;

export const InferRelationshipsOutputSchema = z.object({
  edgesCreated: z.number(),
  edgesUpdated: z.number(),
  edgesRemoved: z.number(),
});

export type InferRelationshipsOutput = z.infer<
  typeof InferRelationshipsOutputSchema
>;

export const DetectPatternsInputSchema = z.object({
  teamId: z.string(),
  entityCount: z.number(),
  relationshipCount: z.number(),
});

export type DetectPatternsInput = z.infer<typeof DetectPatternsInputSchema>;

export const DetectPatternsOutputSchema = z.object({
  patternsDetected: z.number(),
  clusters: z.number(),
  communities: z.number(),
});

export type DetectPatternsOutput = z.infer<typeof DetectPatternsOutputSchema>;

export const DecayScoresInputSchema = z.object({
  teamId: z.string(),
  halfLifeDays: z.number(),
});

export type DecayScoresInput = z.infer<typeof DecayScoresInputSchema>;

export const DecayScoresOutputSchema = z.object({
  scoresDecayed: z.number(),
  entitiesPruned: z.number(),
});

export type DecayScoresOutput = z.infer<typeof DecayScoresOutputSchema>;

export const PersistInferenceInputSchema = z.object({
  teamId: z.string(),
  inferenceRunId: z.string(),
  mentionResult: AggregateMentionsOutputSchema,
  expertiseResult: ComputeExpertiseOutputSchema,
  relationshipResult: InferRelationshipsOutputSchema,
  patternResult: DetectPatternsOutputSchema,
  decayResult: DecayScoresOutputSchema,
});

export type PersistInferenceInput = z.infer<typeof PersistInferenceInputSchema>;

export const PersistInferenceOutputSchema = z.object({
  persisted: z.boolean(),
});

export type PersistInferenceOutput = z.infer<
  typeof PersistInferenceOutputSchema
>;
