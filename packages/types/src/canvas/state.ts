import { z } from "zod";
import { AgentCanvasEdgeSchema } from "./edges";
import { AgentCanvasNodeSchema } from "./nodes";

export const ViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
});

export type Viewport = z.infer<typeof ViewportSchema>;

export const CanvasStateSchema = z.object({
  nodes: z.array(AgentCanvasNodeSchema),
  edges: z.array(AgentCanvasEdgeSchema),
  viewport: ViewportSchema.optional(),
});

export type CanvasState = z.infer<typeof CanvasStateSchema>;

export const SelectionStateSchema = z.object({
  nodes: z.array(z.string()),
  edges: z.array(z.string()),
});

export type SelectionState = z.infer<typeof SelectionStateSchema>;
