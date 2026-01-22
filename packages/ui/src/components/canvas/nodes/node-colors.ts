"use client";

import type { CanvasNodeType } from "@openplane/types/canvas";

export const NODE_COLORS: Record<CanvasNodeType | "default", string> = {
  start: "var(--node-start)",
  end: "var(--node-end)",
  condition: "var(--node-condition)",
  loop: "var(--node-loop)",
  parallel_split: "var(--node-parallel)",
  parallel_join: "var(--node-parallel)",
  retry: "var(--node-control)",
  try_catch: "var(--node-control)",
  llm: "var(--node-llm)",
  rag: "var(--node-rag)",
  summarize: "var(--node-summarize)",
  extract: "var(--node-extract)",
  classify: "var(--node-classify)",
  embeddings: "var(--node-ai)",
  rerank: "var(--node-ai)",
  chunk: "var(--node-ai)",
  merge: "var(--node-ai)",
  transform: "var(--node-template)",
  filter: "var(--node-filter)",
  template: "var(--node-template)",
  code: "var(--node-script)",
  approval: "var(--node-approval)",
  input: "var(--node-input)",
  notify: "var(--node-notify)",
  annotation: "var(--node-summarize)",
  connector: "var(--node-connector)",
  connector_action: "var(--node-connector)",
  tool: "var(--node-tool)",
  http_request: "var(--node-integration)",
  database_query: "var(--node-integration)",
  graphql_query: "var(--node-integration)",
  trigger_manual: "var(--node-trigger)",
  trigger_schedule: "var(--node-trigger)",
  trigger_webhook: "var(--node-trigger)",
  trigger_event: "var(--node-trigger)",
  memory_read: "var(--node-memory)",
  memory_write: "var(--node-memory)",
  memory_search: "var(--node-memory)",
  sub_workflow: "var(--node-orchestration)",
  agent_call: "var(--node-orchestration)",
  parallel_map: "var(--node-orchestration)",
  default: "var(--muted-foreground)",
};

export function getNodeColor(nodeType: CanvasNodeType): string {
  return NODE_COLORS[nodeType] ?? NODE_COLORS.default;
}
