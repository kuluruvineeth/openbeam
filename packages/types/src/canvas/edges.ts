import { z } from "zod";

export const EdgeTypeSchema = z.enum(["data", "control", "conditional"]);
export type EdgeType = z.infer<typeof EdgeTypeSchema>;

export const AgentCanvasEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  type: EdgeTypeSchema.default("data"),
  data: z
    .object({
      label: z.string().optional(),
      condition: z.string().optional(),
      animated: z.boolean().optional(),
    })
    .optional(),
  selected: z.boolean().optional(),
});

export type AgentCanvasEdge = z.infer<typeof AgentCanvasEdgeSchema>;
