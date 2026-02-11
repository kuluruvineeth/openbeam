import type { CanvasOperation } from "@openplane/types/canvas";
import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

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
  execute: (params, ctx) => {
    if (params.source === params.target) {
      return failure(
        "INVALID_INPUT",
        "Source and target cannot be the same node",
        {
          suggestion: "Choose two different nodes when creating a connection.",
        }
      );
    }

    if (ctx.canvasState) {
      const sourceNode = ctx.canvasState.nodes.find(
        (node) => node.id === params.source
      );
      const targetNode = ctx.canvasState.nodes.find(
        (node) => node.id === params.target
      );

      if (!(sourceNode && targetNode)) {
        return failure(
          "NOT_FOUND",
          "Source or target node not found in canvas state",
          {
            suggestion:
              "Run canvas_get_state and use valid node IDs for source/target.",
          }
        );
      }

      if (sourceNode.type === "end") {
        return failure(
          "INVALID_STATE",
          "End nodes cannot have outgoing connections",
          {
            suggestion:
              "Connect another node into the end node instead of from it.",
          }
        );
      }

      if (targetNode.type === "start") {
        return failure(
          "INVALID_STATE",
          "Start nodes cannot have incoming connections",
          {
            suggestion: "Connect from the start node to downstream nodes.",
          }
        );
      }

      const duplicate = ctx.canvasState.edges.some(
        (edge) =>
          edge.source === params.source &&
          edge.target === params.target &&
          edge.sourceHandle === params.sourceHandle &&
          edge.targetHandle === params.targetHandle
      );

      if (duplicate) {
        return failure(
          "INVALID_STATE",
          "An identical connection already exists",
          {
            suggestion:
              "Update or remove the existing edge instead of creating a duplicate.",
          }
        );
      }
    }

    const edgeId = crypto.randomUUID();

    const operation: CanvasOperation = {
      type: "connect",
      id: edgeId,
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      timestamp: Date.now(),
    };

    if (ctx.canvasState) {
      ctx.canvasState.edges.push({
        id: edgeId,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
      });
    }

    return success({
      edgeId,
      operation,
      message: `Connected ${params.source} → ${params.target}`,
    });
  },
});
