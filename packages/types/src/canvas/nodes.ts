import { z } from "zod";

export const NodeStatusSchema = z.enum([
  "idle",
  "pending",
  "running",
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
  "llm",
  "rag",
  "summarize",
  "extract",
  "classify",
  "transform",
  "filter",
  "template",
  "code",
  "approval",
  "input",
  "notify",
  "annotation",
  "connector",
  "tool",
]);

export type CanvasNodeType = z.infer<typeof CanvasNodeTypeSchema>;

export const NODE_CATEGORIES: Record<CanvasNodeType, NodeCategory> = {
  start: "control",
  end: "control",
  condition: "control",
  loop: "control",
  parallel_split: "control",
  parallel_join: "control",
  llm: "ai",
  rag: "ai",
  summarize: "ai",
  extract: "ai",
  classify: "ai",
  transform: "transform",
  filter: "transform",
  template: "transform",
  code: "transform",
  approval: "human",
  input: "human",
  notify: "human",
  annotation: "human",
  connector: "integration",
  tool: "integration",
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

export const LlmNodeConfigSchema = z.object({
  model: z.string(),
  systemPrompt: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().positive().default(4096),
  tools: z.array(z.string()).optional(),
  responseFormat: z.enum(["text", "json", "structured"]).default("text"),
  outputSchema: z.unknown().optional(),
});

export type LlmNodeConfig = z.infer<typeof LlmNodeConfigSchema>;

export const RagNodeConfigSchema = z.object({
  searchType: z.enum(["hybrid", "semantic", "keyword"]).default("hybrid"),
  topK: z.number().positive().default(10),
  rerank: z.boolean().default(true),
  minScore: z.number().min(0).max(1).default(0.5),
  connectorTypes: z.array(z.string()).optional(),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
});

export type RagNodeConfig = z.infer<typeof RagNodeConfigSchema>;

export const SummarizeNodeConfigSchema = z.object({
  style: z.enum(["bullets", "paragraph", "executive"]).default("paragraph"),
  maxLength: z.number().positive().optional(),
  model: z.string().optional(),
});

export type SummarizeNodeConfig = z.infer<typeof SummarizeNodeConfigSchema>;

export const ExtractNodeConfigSchema = z.object({
  schema: z.unknown(),
  examples: z.array(z.unknown()).optional(),
  model: z.string().optional(),
});

export type ExtractNodeConfig = z.infer<typeof ExtractNodeConfigSchema>;

export const ClassifyNodeConfigSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
    })
  ),
  allowMultiple: z.boolean().default(false),
  model: z.string().optional(),
});

export type ClassifyNodeConfig = z.infer<typeof ClassifyNodeConfigSchema>;

export const ConditionNodeConfigSchema = z.object({
  expression: z.string(),
  branches: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      condition: z.string(),
    })
  ),
  defaultBranch: z.string().optional(),
});

export type ConditionNodeConfig = z.infer<typeof ConditionNodeConfigSchema>;

export const LoopNodeConfigSchema = z.object({
  type: z.enum(["forEach", "while", "times"]),
  collection: z.string().optional(),
  condition: z.string().optional(),
  times: z.number().optional(),
  maxIterations: z.number().default(100),
});

export type LoopNodeConfig = z.infer<typeof LoopNodeConfigSchema>;

export const ParallelNodeConfigSchema = z.object({
  branches: z.array(z.string()),
  waitForAll: z.boolean().default(true),
  timeoutMs: z.number().optional(),
});

export type ParallelNodeConfig = z.infer<typeof ParallelNodeConfigSchema>;

export const TransformNodeConfigSchema = z.object({
  expression: z.string(),
  language: z.enum(["jmespath", "jsonata", "javascript"]).default("jmespath"),
});

export type TransformNodeConfig = z.infer<typeof TransformNodeConfigSchema>;

export const FilterNodeConfigSchema = z.object({
  expression: z.string(),
  language: z.enum(["jmespath", "jsonata", "javascript"]).default("jmespath"),
});

export type FilterNodeConfig = z.infer<typeof FilterNodeConfigSchema>;

export const TemplateNodeConfigSchema = z.object({
  template: z.string(),
  language: z.enum(["handlebars", "mustache", "ejs"]).default("handlebars"),
});

export type TemplateNodeConfig = z.infer<typeof TemplateNodeConfigSchema>;

export const ScriptNodeConfigSchema = z.object({
  code: z.string(),
  runtime: z.enum(["javascript", "python"]).default("javascript"),
  timeoutMs: z.number().default(30_000),
});

export type ScriptNodeConfig = z.infer<typeof ScriptNodeConfigSchema>;

export const ApprovalNodeConfigSchema = z.object({
  message: z.string(),
  approvers: z.array(z.string()).optional(),
  timeoutMs: z.number().optional(),
  autoApprove: z.boolean().default(false),
});

export type ApprovalNodeConfig = z.infer<typeof ApprovalNodeConfigSchema>;

export const InputNodeConfigSchema = z.object({
  prompt: z.string(),
  inputType: z.enum(["text", "number", "boolean", "select", "multiselect"]),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(true),
  defaultValue: z.unknown().optional(),
  validation: z.string().optional(),
});

export type InputNodeConfig = z.infer<typeof InputNodeConfigSchema>;

export const NotifyNodeConfigSchema = z.object({
  channel: z.enum(["email", "slack", "webhook"]),
  template: z.string(),
  recipients: z.array(z.string()).optional(),
  webhookUrl: z.string().optional(),
});

export type NotifyNodeConfig = z.infer<typeof NotifyNodeConfigSchema>;

export const AnnotationColorSchema = z.enum([
  "yellow",
  "blue",
  "green",
  "pink",
  "purple",
  "orange",
]);

export type AnnotationColor = z.infer<typeof AnnotationColorSchema>;

export const AnnotationNodeConfigSchema = z.object({
  color: AnnotationColorSchema.default("yellow"),
});

export type AnnotationNodeConfig = z.infer<typeof AnnotationNodeConfigSchema>;

export const ConnectorNodeConfigSchema = z.object({
  connectorType: z.string(),
  operation: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export type ConnectorNodeConfig = z.infer<typeof ConnectorNodeConfigSchema>;

export const ToolNodeConfigSchema = z.object({
  toolId: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export type ToolNodeConfig = z.infer<typeof ToolNodeConfigSchema>;

export const StartNodeConfigSchema = z.object({
  triggerType: z
    .enum(["manual", "schedule", "webhook", "event"])
    .default("manual"),
  schedule: z.string().optional(),
  webhookPath: z.string().optional(),
  eventType: z.string().optional(),
});

export type StartNodeConfig = z.infer<typeof StartNodeConfigSchema>;

export const EndNodeConfigSchema = z.object({
  outputType: z
    .enum(["result", "notification", "webhook", "none"])
    .default("result"),
  webhookUrl: z.string().optional(),
  notificationChannel: z.string().optional(),
});

export type EndNodeConfig = z.infer<typeof EndNodeConfigSchema>;

export const ParallelSplitNodeConfigSchema = z.object({
  branches: z.number().min(2).default(2),
});

export type ParallelSplitNodeConfig = z.infer<
  typeof ParallelSplitNodeConfigSchema
>;

export const ParallelJoinNodeConfigSchema = z.object({
  branches: z.number().min(2).default(2),
  joinType: z.enum(["all", "any", "race"]).default("all"),
  timeout: z.number().optional(),
});

export type ParallelJoinNodeConfig = z.infer<
  typeof ParallelJoinNodeConfigSchema
>;

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
  type: CanvasNodeTypeSchema,
  position: PositionSchema,
  data: z.unknown(),
  selected: z.boolean().optional(),
  dragging: z.boolean().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  parentId: z.string().optional(),
  extent: z.enum(["parent"]).optional(),
  expandParent: z.boolean().optional(),
  zIndex: z.number().optional(),
});

export type AgentCanvasNode = z.infer<typeof AgentCanvasNodeSchema>;
