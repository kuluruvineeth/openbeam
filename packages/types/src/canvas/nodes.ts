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
  "retry",
  "try_catch",
  "llm",
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

export const WebhookConfigSchema = z.object({
  path: z.string(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
  authentication: z
    .enum(["none", "hmac-sha256", "bearer", "basic", "api-key"])
    .default("hmac-sha256"),
  secret: z.string().optional(),
  signatureHeader: z.string().optional(),
  rateLimit: z
    .object({
      requests: z.number(),
      windowMs: z.number(),
    })
    .optional(),
  allowedIps: z.array(z.string()).optional(),
});

export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

export const EventConfigSchema = z.object({
  connectorId: z.string().optional(),
  connectorType: z.enum(["slack", "linear", "notion", "gmail", "google-drive"]),
  eventId: z.string(),
  resourceId: z.string().optional(),
  resourceType: z.string().optional(),
  resourceName: z.string().optional(),
});

export type EventConfig = z.infer<typeof EventConfigSchema>;

export const FilterOperatorSchema = z.enum([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "regex",
  "gt",
  "lt",
  "gte",
  "lte",
  "in",
  "not_in",
  "exists",
  "not_exists",
]);

export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

export const CustomFilterConditionSchema = z.object({
  field: z.string(),
  operator: FilterOperatorSchema,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.union([z.string(), z.number()])),
  ]),
});

export type CustomFilterCondition = z.infer<typeof CustomFilterConditionSchema>;

export const EventTriggerFiltersSchema = z.object({
  keywords: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  priorities: z.array(z.string()).optional(),
  statuses: z.array(z.string()).optional(),
  channels: z.array(z.string()).optional(),
  mentions: z.boolean().optional(),
  includeReplies: z.boolean().optional(),
  excludeBots: z.boolean().optional(),
  customConditions: z.array(CustomFilterConditionSchema).optional(),
});

export type EventTriggerFilters = z.infer<typeof EventTriggerFiltersSchema>;

export const EventTriggerOptionsSchema = z.object({
  debounceMs: z.number().positive().optional(),
  batchSize: z.number().positive().max(100).optional(),
  batchWindowMs: z.number().positive().optional(),
  deduplicateKey: z.string().optional(),
  maxRetries: z.number().min(0).max(5).optional(),
  retryDelayMs: z.number().positive().optional(),
});

export type EventTriggerOptions = z.infer<typeof EventTriggerOptionsSchema>;

export const ConnectorEventTriggerConfigSchema = z.object({
  connectorId: z.string().optional(),
  connectorType: z.enum(["slack", "linear", "notion", "gmail", "google-drive"]),
  eventId: z.string(),

  resourceId: z.string().optional(),
  resourceType: z.string().optional(),
  resourceName: z.string().optional(),

  filters: EventTriggerFiltersSchema.optional(),
  options: EventTriggerOptionsSchema.optional(),
});

export type ConnectorEventTriggerConfig = z.infer<
  typeof ConnectorEventTriggerConfigSchema
>;

export const StartNodeConfigSchema = z.object({
  triggerType: z
    .enum(["manual", "schedule", "webhook", "event"])
    .default("manual"),
  schedule: z.string().optional(),
  webhookConfig: WebhookConfigSchema.optional(),
  eventConfig: ConnectorEventTriggerConfigSchema.optional(),
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

export const RetryNodeConfigSchema = z.object({
  maxAttempts: z.number().min(1).max(10).default(3),
  backoffMs: z.number().min(100).default(1000),
  exponential: z.boolean().default(true),
  retryOnErrors: z.array(z.string()).optional(),
  jitterMs: z.number().min(0).optional(),
});

export type RetryNodeConfig = z.infer<typeof RetryNodeConfigSchema>;

export const TryCatchNodeConfigSchema = z.object({
  catchErrors: z.array(z.string()).optional(),
  fallbackValue: z.unknown().optional(),
  rethrowUnhandled: z.boolean().default(true),
  logErrors: z.boolean().default(true),
});

export type TryCatchNodeConfig = z.infer<typeof TryCatchNodeConfigSchema>;

export const EmbeddingsNodeConfigSchema = z.object({
  model: z.string().default("text-embedding-3-small"),
  dimensions: z.number().positive().optional(),
  batchSize: z.number().positive().default(100),
  normalize: z.boolean().default(true),
});

export type EmbeddingsNodeConfig = z.infer<typeof EmbeddingsNodeConfigSchema>;

export const RerankNodeConfigSchema = z.object({
  model: z.string().default("cohere-rerank-v3"),
  topK: z.number().positive().default(10),
  threshold: z.number().min(0).max(1).optional(),
  returnScores: z.boolean().default(true),
});

export type RerankNodeConfig = z.infer<typeof RerankNodeConfigSchema>;

export const ChunkNodeConfigSchema = z.object({
  strategy: z
    .enum(["fixed", "semantic", "sentence", "paragraph"])
    .default("semantic"),
  maxChunkSize: z.number().positive().default(512),
  overlap: z.number().min(0).default(50),
  preserveStructure: z.boolean().default(true),
});

export type ChunkNodeConfig = z.infer<typeof ChunkNodeConfigSchema>;

export const MergeNodeConfigSchema = z.object({
  strategy: z
    .enum(["concatenate", "interleave", "deduplicate"])
    .default("concatenate"),
  separator: z.string().default("\n\n"),
  maxLength: z.number().positive().optional(),
  dedupeThreshold: z.number().min(0).max(1).default(0.95),
});

export type MergeNodeConfig = z.infer<typeof MergeNodeConfigSchema>;

export const HttpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

export const HttpRequestNodeConfigSchema = z.object({
  url: z.string(),
  method: HttpMethodSchema.default("GET"),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
  queryParams: z.record(z.string(), z.string()).optional(),
  timeoutMs: z.number().positive().default(30_000),
  retryOn5xx: z.boolean().default(true),
  validateStatus: z.array(z.number()).optional(),
  responseType: z.enum(["json", "text", "blob"]).default("json"),
});

export type HttpRequestNodeConfig = z.infer<typeof HttpRequestNodeConfigSchema>;

export const DatabaseQueryNodeConfigSchema = z.object({
  connectionId: z.string(),
  query: z.string(),
  parameters: z.array(z.unknown()).optional(),
  timeout: z.number().positive().default(30_000),
  readOnly: z.boolean().default(true),
  maxRows: z.number().positive().default(1000),
});

export type DatabaseQueryNodeConfig = z.infer<
  typeof DatabaseQueryNodeConfigSchema
>;

export const GraphqlQueryNodeConfigSchema = z.object({
  endpoint: z.string(),
  query: z.string(),
  variables: z.record(z.string(), z.unknown()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  operationName: z.string().optional(),
  timeoutMs: z.number().positive().default(30_000),
});

export type GraphqlQueryNodeConfig = z.infer<
  typeof GraphqlQueryNodeConfigSchema
>;

export const TriggerManualNodeConfigSchema = z.object({
  inputSchema: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum([
          "string",
          "number",
          "boolean",
          "array",
          "object",
          "file",
        ]),
        required: z.boolean().default(true),
        description: z.string().optional(),
        defaultValue: z.unknown().optional(),
      })
    )
    .optional(),
  requiredPermissions: z.array(z.string()).optional(),
});

export type TriggerManualNodeConfig = z.infer<
  typeof TriggerManualNodeConfigSchema
>;

export const TriggerScheduleNodeConfigSchema = z.object({
  cron: z.string(),
  timezone: z.string().default("UTC"),
  enabled: z.boolean().default(true),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  maxRuns: z.number().positive().optional(),
  runOnStart: z.boolean().default(false),
  catchUpMissed: z.boolean().default(false),
});

export type TriggerScheduleNodeConfig = z.infer<
  typeof TriggerScheduleNodeConfigSchema
>;

export const TriggerWebhookNodeConfigSchema = z.object({
  path: z.string(),
  method: HttpMethodSchema.default("POST"),
  authentication: z
    .enum(["none", "bearer", "basic", "hmac", "api_key"])
    .default("none"),
  secret: z.string().optional(),
  signatureHeader: z.string().optional(),
  validationSchema: z.unknown().optional(),
  rateLimit: z
    .object({
      requests: z.number(),
      windowMs: z.number(),
    })
    .optional(),
  allowedIps: z.array(z.string()).optional(),
});

export type TriggerWebhookNodeConfig = z.infer<
  typeof TriggerWebhookNodeConfigSchema
>;

export const TriggerEventNodeConfigSchema = z.object({
  eventType: z.string(),
  eventSource: z
    .enum(["connector", "system", "custom", "workflow"])
    .default("system"),
  connectorType: z.string().optional(),
  filter: z.record(z.string(), z.unknown()).optional(),
  debounceMs: z.number().positive().optional(),
  batchSize: z.number().positive().optional(),
  batchWindowMs: z.number().positive().optional(),
});

export type TriggerEventNodeConfig = z.infer<
  typeof TriggerEventNodeConfigSchema
>;

export const MemoryReadNodeConfigSchema = z.object({
  key: z.string(),
  namespace: z.string().optional(),
  scope: z.enum(["workflow", "user", "team", "global"]).default("workflow"),
  defaultValue: z.unknown().optional(),
});

export type MemoryReadNodeConfig = z.infer<typeof MemoryReadNodeConfigSchema>;

export const MemoryWriteNodeConfigSchema = z.object({
  key: z.string(),
  namespace: z.string().optional(),
  scope: z.enum(["workflow", "user", "team", "global"]).default("workflow"),
  ttlMs: z.number().positive().optional(),
  overwrite: z.boolean().default(true),
});

export type MemoryWriteNodeConfig = z.infer<typeof MemoryWriteNodeConfigSchema>;

export const MemorySearchNodeConfigSchema = z.object({
  query: z.string(),
  namespace: z.string().optional(),
  scope: z.enum(["workflow", "user", "team", "global"]).default("workflow"),
  topK: z.number().positive().default(10),
  threshold: z.number().min(0).max(1).optional(),
  includeMetadata: z.boolean().default(true),
});

export type MemorySearchNodeConfig = z.infer<
  typeof MemorySearchNodeConfigSchema
>;

export const SubWorkflowNodeConfigSchema = z.object({
  workflowId: z.string(),
  version: z.string().optional(),
  inputMappings: z.record(z.string(), z.unknown()).optional(),
  outputMappings: z.record(z.string(), z.string()).optional(),
  waitForCompletion: z.boolean().default(true),
  timeoutMs: z.number().positive().optional(),
  inheritContext: z.boolean().default(true),
});

export type SubWorkflowNodeConfig = z.infer<typeof SubWorkflowNodeConfigSchema>;

export const AgentCallNodeConfigSchema = z.object({
  agentId: z.string(),
  prompt: z.string(),
  tools: z.array(z.string()).optional(),
  model: z.string().optional(),
  maxSteps: z.number().positive().default(10),
  temperature: z.number().min(0).max(2).default(0.7),
  systemPromptOverride: z.string().optional(),
});

export type AgentCallNodeConfig = z.infer<typeof AgentCallNodeConfigSchema>;

export const ParallelMapNodeConfigSchema = z.object({
  collection: z.string(),
  maxConcurrency: z.number().positive().default(10),
  continueOnError: z.boolean().default(false),
  timeout: z.number().positive().optional(),
  batchSize: z.number().positive().optional(),
});

export type ParallelMapNodeConfig = z.infer<typeof ParallelMapNodeConfigSchema>;

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
