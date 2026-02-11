import type { LlmAgentConfig } from "../config";
import { CANVAS_BUILDER_PROMPT } from "./prompts";

export const CANVAS_BUILDER_TOOLS = [
  "canvas_add_node",
  "canvas_remove_node",
  "canvas_connect_nodes",
  "canvas_disconnect_nodes",
  "canvas_update_config",
  "canvas_auto_layout",
  "canvas_get_state",
  "canvas_validate",
  "canvas_list_node_types",
  "canvas_list_connectors",
  "canvas_get_node_schema",
  "canvas_list_templates",
  "canvas_apply_template",
] as const;

export const canvasBuilderConfig: LlmAgentConfig = {
  type: "llm",
  name: "canvas-builder",
  description:
    "Builds visual workflow canvases from natural language descriptions",
  tools: [...CANVAS_BUILDER_TOOLS],
  systemPrompt: CANVAS_BUILDER_PROMPT,
  maxSteps: 20,
  model: {
    temperature: 0.1,
  },
};

export function createCanvasBuilderConfig(
  overrides?: Partial<LlmAgentConfig>
): LlmAgentConfig {
  return {
    ...canvasBuilderConfig,
    ...overrides,
    model: {
      ...canvasBuilderConfig.model,
      ...overrides?.model,
    },
  };
}
