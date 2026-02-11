import { z } from "zod";

export const CanvasOperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("add_node"),
    id: z.string(),
    nodeType: z.string(),
    position: z.object({ x: z.number(), y: z.number() }).optional(),
    label: z.string().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    toolCallId: z.string().optional(),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal("remove_node"),
    id: z.string(),
    nodeId: z.string(),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal("connect"),
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().optional(),
    targetHandle: z.string().optional(),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal("disconnect"),
    id: z.string(),
    edgeId: z.string(),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal("update_config"),
    id: z.string(),
    nodeId: z.string(),
    config: z.record(z.string(), z.unknown()),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal("layout"),
    id: z.string(),
    direction: z.enum(["TB", "LR"]).optional(),
    timestamp: z.number(),
  }),
]);

export type CanvasOperation = z.infer<typeof CanvasOperationSchema>;

export type CanvasOperationType = CanvasOperation["type"];

export const AddNodeOperationSchema = z.object({
  type: z.literal("add_node"),
  id: z.string(),
  nodeType: z.string(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  label: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  toolCallId: z.string().optional(),
  timestamp: z.number(),
});

export type AddNodeOperation = z.infer<typeof AddNodeOperationSchema>;

export const RemoveNodeOperationSchema = z.object({
  type: z.literal("remove_node"),
  id: z.string(),
  nodeId: z.string(),
  timestamp: z.number(),
});

export type RemoveNodeOperation = z.infer<typeof RemoveNodeOperationSchema>;

export const ConnectOperationSchema = z.object({
  type: z.literal("connect"),
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  timestamp: z.number(),
});

export type ConnectOperation = z.infer<typeof ConnectOperationSchema>;

export const DisconnectOperationSchema = z.object({
  type: z.literal("disconnect"),
  id: z.string(),
  edgeId: z.string(),
  timestamp: z.number(),
});

export type DisconnectOperation = z.infer<typeof DisconnectOperationSchema>;

export const UpdateConfigOperationSchema = z.object({
  type: z.literal("update_config"),
  id: z.string(),
  nodeId: z.string(),
  config: z.record(z.string(), z.unknown()),
  timestamp: z.number(),
});

export type UpdateConfigOperation = z.infer<typeof UpdateConfigOperationSchema>;

export const LayoutOperationSchema = z.object({
  type: z.literal("layout"),
  id: z.string(),
  direction: z.enum(["TB", "LR"]).optional(),
  timestamp: z.number(),
});

export type LayoutOperation = z.infer<typeof LayoutOperationSchema>;

export type LayoutDirection = "TB" | "LR";

export const BuilderStatusSchema = z.enum(["idle", "building", "error"]);

export type BuilderStatus = z.infer<typeof BuilderStatusSchema>;
