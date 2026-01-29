import type { CanvasOperation } from "@openplane/types/canvas";
import { z } from "zod";
import { defineTool, success } from "../../builder";

export const canvasDisconnectNodesTool = defineTool({
  name: "canvas_disconnect_nodes",
  description:
    "Remove an edge between two nodes, breaking the workflow connection.",
  category: "canvas",
  parameters: z.object({
    edgeId: z.string().describe("The ID of the edge to remove"),
  }),
  stakes: "low",
  reversibility: "easy",
  execute: (params) => {
    const operation: CanvasOperation = {
      type: "disconnect",
      id: crypto.randomUUID(),
      edgeId: params.edgeId,
      timestamp: Date.now(),
    };

    return success({
      operation,
      message: `Disconnected edge ${params.edgeId}`,
    });
  },
});
