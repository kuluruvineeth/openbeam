import type { CanvasOperation } from "@openplane/types/canvas";
import { z } from "zod";
import { defineTool, success } from "../../builder";

export const canvasUpdateConfigTool = defineTool({
  name: "canvas_update_node_config",
  description:
    "Update the configuration of an existing node. Use this to modify node settings like prompts, models, conditions, etc.",
  category: "canvas",
  parameters: z.object({
    nodeId: z.string().describe("The ID of the node to update"),
    config: z
      .record(z.string(), z.unknown())
      .describe("Configuration properties to update (merged with existing)"),
  }),
  stakes: "low",
  reversibility: "easy",
  execute: (params) => {
    const operation: CanvasOperation = {
      type: "update_config",
      id: crypto.randomUUID(),
      nodeId: params.nodeId,
      config: params.config,
      timestamp: Date.now(),
    };

    return success({
      operation,
      message: ["Updated config for node", params.nodeId].join(" "),
    });
  },
});
