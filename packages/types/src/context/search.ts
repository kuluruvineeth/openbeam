import { z } from "zod";
import { ContextTypeSchema } from "./enums";
import { ContextRelationSchema } from "./relation";

export const ContextSearchInputSchema = z.object({
  query: z.string(),
  teamId: z.string(),
  scope: z.string().nullable().optional(),
  contextType: ContextTypeSchema.nullable().optional(),
  limit: z.number().int().positive().default(20),
  scoreThreshold: z.number().nullable().optional(),
});

export type ContextSearchInput = z.infer<typeof ContextSearchInputSchema>;

export const ContextSearchResultSchema = z.object({
  uri: z.string(),
  abstractText: z.string(),
  score: z.number(),
  contextType: ContextTypeSchema,
  category: z.string().nullable(),
  activeCount: z.number().int().nonnegative(),
  updatedAt: z.coerce.date(),
  relations: z.array(ContextRelationSchema).max(5).default([]),
});

export type ContextSearchResult = z.infer<typeof ContextSearchResultSchema>;

export const RetrievalStepSchema = z.object({
  directory: z.string(),
  childrenSearched: z.number().int().nonnegative(),
  topScore: z.number(),
  converged: z.boolean(),
  depth: z.number().int().nonnegative(),
  durationMs: z.number().nonnegative().optional(),
});

export type RetrievalStep = z.infer<typeof RetrievalStepSchema>;

export const HierarchicalSearchResultSchema = z.object({
  resources: z.array(ContextSearchResultSchema),
  memories: z.array(ContextSearchResultSchema),
  skills: z.array(ContextSearchResultSchema),
  tools: z.array(ContextSearchResultSchema),
  total: z.number().int().nonnegative(),
  retrievalPath: z.array(z.string()),
  trajectory: z.array(RetrievalStepSchema).default([]),
});

export type HierarchicalSearchResult = z.infer<
  typeof HierarchicalSearchResultSchema
>;

export const TypedQuerySchema = z.object({
  query: z.string(),
  contextType: ContextTypeSchema.nullable().optional(),
  priority: z.number().int().min(1).max(5),
});

export type TypedQuery = z.infer<typeof TypedQuerySchema>;
