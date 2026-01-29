import type { CanvasOperation } from "@openplane/types/canvas";
import { CanvasNodeTypeSchema } from "@openplane/types/canvas";
import { z } from "zod";
import { defineTool, success } from "../../builder";

const NODE_TYPES_DESCRIPTION =
  "Add a node to the canvas workflow. Available types: start, end, condition, loop, parallel_split, parallel_join, retry, try_catch, llm, rag, summarize, extract, classify, embeddings, rerank, chunk, merge, transform, filter, template, code, approval, input, notify, annotation, connector, connector_action, tool, http_request, database_query, graphql_query, trigger_manual, trigger_schedule, trigger_webhook, trigger_event, memory_read, memory_write, memory_search, sub_workflow, agent_call, parallel_map";

export const canvasAddNodeTool = defineTool({
  name: "canvas_add_node",
  description: NODE_TYPES_DESCRIPTION,
  category: "canvas",
  parameters: z.object({
    type: CanvasNodeTypeSchema.describe("The type of node to add"),
    label: z.string().optional().describe("Display label for the node"),
    position: z
      .object({ x: z.number(), y: z.number() })
      .optional()
      .describe("Position on canvas (auto-calculated if not provided)"),
    config: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Node-specific configuration"),
  }),
  stakes: "low",
  reversibility: "easy",
  execute: (params) => {
    const nodeId = [
      params.type,
      Date.now(),
      Math.random().toString(36).slice(2, 7),
    ].join("-");
    const position = params.position ?? { x: 100, y: 100 };

    const operation: CanvasOperation = {
      type: "add_node",
      id: crypto.randomUUID(),
      nodeType: params.type,
      position,
      label: params.label,
      config: params.config,
      timestamp: Date.now(),
    };

    const message = params.label
      ? ["Added", params.type, "node", `"${params.label}"`].join(" ")
      : ["Added", params.type, "node"].join(" ");

    return success({
      nodeId,
      operation,
      message,
    });
  },
});
