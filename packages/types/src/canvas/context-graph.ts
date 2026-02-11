import { z } from "zod";

export const ContextNodeKindSchema = z.enum([
  "raw_content",
  "change",
  "personal",
  "knowledge",
  "inference",
  "action",
  "artifact",
]);

export const ContextEdgeKindSchema = z.enum([
  "supports",
  "contradicts",
  "derived_from",
  "references",
  "updates",
  "triggers",
]);

export const ContextInferenceStatusSchema = z.enum([
  "proposed",
  "verified",
  "rejected",
  "escalated",
]);

export const ContextNodeSchema = z.object({
  id: z.string(),
  kind: ContextNodeKindSchema,
  label: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const ContextEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  kind: ContextEdgeKindSchema,
  weight: z.number().optional(),
});

export const ContextSnapshotSchema = z.object({
  id: z.string(),
  executionId: z.string(),
  version: z.number(),
  createdAt: z.number(),
  nodes: z.array(ContextNodeSchema),
  edges: z.array(ContextEdgeSchema),
  seedRefs: z.array(z.string()),
});

export type ContextNodeKind = z.infer<typeof ContextNodeKindSchema>;
export type ContextEdgeKind = z.infer<typeof ContextEdgeKindSchema>;
export type ContextInferenceStatus = z.infer<
  typeof ContextInferenceStatusSchema
>;
export type ContextNode = z.infer<typeof ContextNodeSchema>;
export type ContextEdge = z.infer<typeof ContextEdgeSchema>;
export type ContextSnapshot = z.infer<typeof ContextSnapshotSchema>;
