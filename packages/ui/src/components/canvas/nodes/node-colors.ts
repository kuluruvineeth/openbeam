"use client";

import type { CanvasNodeType } from "@openplane/types/canvas";

export const NODE_COLORS: Record<CanvasNodeType | "default", string> = {
  start: "var(--node-start)",
  end: "var(--node-end)",
  condition: "var(--node-condition)",
  loop: "var(--node-loop)",
  parallel_split: "var(--node-parallel)",
  parallel_join: "var(--node-parallel)",
  llm: "var(--node-llm)",
  rag: "var(--node-rag)",
  summarize: "var(--node-summarize)",
  extract: "var(--node-extract)",
  classify: "var(--node-classify)",
  transform: "var(--node-template)",
  filter: "var(--node-filter)",
  template: "var(--node-template)",
  code: "var(--node-script)",
  approval: "var(--node-approval)",
  input: "var(--node-input)",
  notify: "var(--node-notify)",
  annotation: "var(--node-summarize)",
  connector: "var(--node-connector)",
  tool: "var(--node-tool)",
  default: "var(--muted-foreground)",
};

export function getNodeColor(nodeType: CanvasNodeType): string {
  return NODE_COLORS[nodeType] ?? NODE_COLORS.default;
}
