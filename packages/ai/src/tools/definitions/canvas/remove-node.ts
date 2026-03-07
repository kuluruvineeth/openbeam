import type { CanvasOperation } from "@openbeam/types/canvas";
import { z } from "zod";
import { defineTool, success } from "../../builder";

export const canvasRemoveNodeTool = defineTool({
  name: "canvas_remove_node",
  description:
    "Remove a node from the canvas. This will also remove any edges connected to the node.",
  category: "canvas",
  parameters: z.object({
    nodeId: z.string().describe("The ID of the node to remove"),
  }),
  stakes: "low",
  reversibility: "easy",
  execute: (params, ctx) => {
    const operation: CanvasOperation = {
      type: "remove_node",
      id: crypto.randomUUID(),
      nodeId: params.nodeId,
      timestamp: Date.now(),
    };

    if (ctx.canvasState) {
      ctx.canvasState.nodes = ctx.canvasState.nodes.filter(
        (n) => n.id !== params.nodeId
      );
      ctx.canvasState.edges = ctx.canvasState.edges.filter(
        (e) => e.source !== params.nodeId && e.target !== params.nodeId
      );
    }

    return success({
      operation,
      message: `Removed node ${params.nodeId}`,
    });
  },
});
