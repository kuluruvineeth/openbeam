import { z } from "zod";

export const NodeStatusSchema = z.enum([
  "idle",
  "pending",
  "running",
  "streaming",
  "success",
  "error",
  "waiting",
  "skipped",
]);

export type NodeStatus = z.infer<typeof NodeStatusSchema>;

export const NodeCategorySchema = z.enum([
  "control",
  "ai",
  "transform",
  "integration",
  "human",
  "trigger",
  "memory",
  "orchestration",
]);

export type NodeCategory = z.infer<typeof NodeCategorySchema>;

export const CanvasNodeTypeSchema = z.enum([
  "start",
  "end",
  "condition",
  "loop",
  "parallel_split",
  "parallel_join",
  "retry",
  "try_catch",
  "llm",
  "image",
  "audio",
  "video",
  "rag",
  "summarize",
  "extract",
  "classify",
  "embeddings",
  "rerank",
  "chunk",
  "merge",
  "transform",
  "filter",
  "template",
  "code",
  "approval",
  "input",
  "notify",
  "annotation",
  "connector",
  "connector_action",
  "tool",
  "http_request",
  "database_query",
  "graphql_query",
  "trigger_manual",
  "trigger_schedule",
  "trigger_webhook",
  "trigger_event",
  "memory_read",
  "memory_write",
  "memory_search",
  "sub_workflow",
  "agent_call",
  "parallel_map",
]);

export type CanvasNodeType = z.infer<typeof CanvasNodeTypeSchema>;

export const NODE_CATEGORIES: Record<CanvasNodeType, NodeCategory> = {
  start: "control",
  end: "control",
  condition: "control",
  loop: "control",
  parallel_split: "control",
  parallel_join: "control",
  retry: "control",
  try_catch: "control",
  llm: "ai",
  image: "ai",
  audio: "ai",
  video: "ai",
  rag: "ai",
  summarize: "ai",
  extract: "ai",
  classify: "ai",
  embeddings: "ai",
  rerank: "ai",
  chunk: "ai",
  merge: "ai",
  transform: "transform",
  filter: "transform",
  template: "transform",
  code: "transform",
  approval: "human",
  input: "human",
  notify: "human",
  annotation: "human",
  connector: "integration",
  connector_action: "integration",
  tool: "integration",
  http_request: "integration",
  database_query: "integration",
  graphql_query: "integration",
  trigger_manual: "trigger",
  trigger_schedule: "trigger",
  trigger_webhook: "trigger",
  trigger_event: "trigger",
  memory_read: "memory",
  memory_write: "memory",
  memory_search: "memory",
  sub_workflow: "orchestration",
  agent_call: "orchestration",
  parallel_map: "orchestration",
};

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type Position = z.infer<typeof PositionSchema>;

export const HandleTypeSchema = z.enum(["source", "target"]);
export type HandleType = z.infer<typeof HandleTypeSchema>;

export const HandlePositionSchema = z.enum(["top", "right", "bottom", "left"]);
export type HandlePosition = z.infer<typeof HandlePositionSchema>;

export const HandleVariantSchema = z.enum([
  "default",
  "true",
  "false",
  "loop",
  "done",
]);

export type HandleVariant = z.infer<typeof HandleVariantSchema>;

export const PortSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(["data", "control"]),
  required: z.boolean(),
});

export type Port = z.infer<typeof PortSchema>;

export const NodeHandleSchema = z.object({
  id: z.string(),
  type: HandleTypeSchema,
  position: HandlePositionSchema,
  label: z.string().optional(),
  dataType: z.string().optional(),
});

export type NodeHandle = z.infer<typeof NodeHandleSchema>;

export const BaseNodeDataSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
  handles: z.array(NodeHandleSchema).optional(),
});

export type BaseNodeData = z.infer<typeof BaseNodeDataSchema>;
