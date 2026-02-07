import type { ExecutionPlan, ExecutionPlanNode } from "@openplane/types/canvas";

export type PlanValidationContext = {
  nodesById: Map<string, ExecutionPlanNode>;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  edgesByTarget: Map<string, ExecutionPlan["edges"]>;
};

export type PlanValidator = (
  node: ExecutionPlanNode,
  ctx: PlanValidationContext
) => void;

export type EnforceExecutionPlanOptions = {
  validateParallelSplitPlan?: PlanValidator;
  validateParallelMapPlan?: PlanValidator;
};

export const SUPPORTED_NODE_TYPES = new Set([
  "start",
  "end",
  "transform",
  "filter",
  "condition",
  "loop",
  "parallel_split",
  "parallel_join",
  "retry",
  "parallel_map",
  "try_catch",
  "template",
  "code",
  "notify",
  "approval",
  "input",
  "sub_workflow",
  "trigger_manual",
  "trigger_schedule",
  "trigger_webhook",
  "trigger_event",
  "agent_call",
  "llm",
  "audio",
  "video",
  "rag",
  "chunk",
  "merge",
  "summarize",
  "extract",
  "classify",
  "embeddings",
  "rerank",
  "image",
  "http_request",
  "database_query",
  "graphql_query",
  "connector",
  "connector_action",
  "tool",
  "memory_write",
  "memory_read",
  "memory_search",
]);

export const ENTRY_NODE_TYPES = new Set([
  "start",
  "trigger_manual",
  "trigger_schedule",
  "trigger_webhook",
  "trigger_event",
]);
