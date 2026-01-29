import { z } from "zod";

export const EdgeTypeSchema = z.enum([
  "data",
  "control",
  "conditional",
  "error",
]);
export type EdgeType = z.infer<typeof EdgeTypeSchema>;

export const AgentCanvasEdgeSchema = z
  .object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().nullish(),
    targetHandle: z.string().nullish(),
    type: z.string().optional(),
    data: z.unknown().optional(),
    selected: z.boolean().optional(),
    animated: z.boolean().optional(),
    hidden: z.boolean().optional(),
    deletable: z.boolean().optional(),
    selectable: z.boolean().optional(),
    focusable: z.boolean().optional(),
    zIndex: z.number().optional(),
    label: z.unknown().optional(),
    style: z.unknown().optional(),
    className: z.string().optional(),
    markerStart: z.unknown().optional(),
    markerEnd: z.unknown().optional(),
  })
  .passthrough();

export type AgentCanvasEdge = z.infer<typeof AgentCanvasEdgeSchema>;

export const StrictAgentCanvasEdgeSchema = AgentCanvasEdgeSchema.extend({
  type: EdgeTypeSchema,
});

export type StrictAgentCanvasEdge = z.infer<typeof StrictAgentCanvasEdgeSchema>;
