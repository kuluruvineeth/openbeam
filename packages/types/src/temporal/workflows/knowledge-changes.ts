import { z } from "zod";

export const ProcessKnowledgeChangesInputSchema = z.object({
  teamId: z.string(),
  connectorId: z.string(),
  syncHistoryId: z.string().optional(),
  changeType: z.enum(["incremental", "full_rebuild"]),
  processedSoFar: z.number().optional(),
});

export type ProcessKnowledgeChangesInput = z.infer<
  typeof ProcessKnowledgeChangesInputSchema
>;

export const ProcessKnowledgeChangesOutputSchema = z.object({
  processed: z.number(),
  entitiesUpdated: z.number(),
  edgesUpdated: z.number(),
});

export type ProcessKnowledgeChangesOutput = z.infer<
  typeof ProcessKnowledgeChangesOutputSchema
>;
