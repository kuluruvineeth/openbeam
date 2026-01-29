import { z } from "zod";
import {
  BaseNodeDataSchema,
  CanvasNodeTypeSchema,
  PositionSchema,
} from "./base";

export const StartNodeDataSchema = BaseNodeDataSchema.extend({
  inputs: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        required: z.boolean().default(true),
        defaultValue: z.unknown().optional(),
      })
    )
    .optional(),
});

export type StartNodeData = z.infer<typeof StartNodeDataSchema>;

export const EndNodeDataSchema = BaseNodeDataSchema.extend({
  outputs: z
    .array(
      z.object({
        name: z.string(),
        expression: z.string(),
      })
    )
    .optional(),
});

export type EndNodeData = z.infer<typeof EndNodeDataSchema>;

export const AgentCanvasNodeSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  position: PositionSchema,
  data: z.unknown(),
  selected: z.boolean().optional(),
  dragging: z.boolean().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  parentId: z.string().optional(),
  extent: z
    .union([
      z.literal("parent"),
      z.tuple([
        z.tuple([z.number(), z.number()]),
        z.tuple([z.number(), z.number()]),
      ]),
    ])
    .nullish(),
  expandParent: z.boolean().optional(),
  zIndex: z.number().optional(),
});

export type AgentCanvasNode = z.infer<typeof AgentCanvasNodeSchema>;

export const StrictAgentCanvasNodeSchema = AgentCanvasNodeSchema.extend({
  type: CanvasNodeTypeSchema,
});

export type StrictAgentCanvasNode = z.infer<typeof StrictAgentCanvasNodeSchema>;
