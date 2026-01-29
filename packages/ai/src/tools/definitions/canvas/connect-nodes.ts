import type { CanvasOperation } from "@openplane/types/canvas";
import { z } from "zod";
import { defineTool, success } from "../../builder";

export const canvasConnectNodesTool = defineTool({
  name: "canvas_connect_nodes",
  description:
    "Connect two nodes with an edge to create a workflow path. The edge goes from source to target.",
  category: "canvas",
  parameters: z.object({
    source: z.string().describe("The ID of the source node"),
    target: z.string().describe("The ID of the target node"),
    sourceHandle: z
      .string()
      .optional()
      .describe(
        "The handle on the source node (for nodes with multiple outputs)"
      ),
    targetHandle: z
      .string()
      .optional()
      .describe(
        "The handle on the target node (for nodes with multiple inputs)"
      ),
  }),
  stakes: "low",
  reversibility: "easy",
  execute: (params) => {
    const edgeId = `${params.source}-${params.target}-${Date.now()}`;

    const operation: CanvasOperation = {
      type: "connect",
      id: crypto.randomUUID(),
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      timestamp: Date.now(),
    };

    return success({
      edgeId,
      operation,
      message: `Connected ${params.source} → ${params.target}`,
    });
  },
});
