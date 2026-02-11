import { z } from "zod";
import { defineTool, success } from "../../builder";

interface ValidationResult {
  valid: boolean;
  issues: string[];
  stats: {
    nodes: number;
    edges: number;
    startNodes: number;
    endNodes: number;
    orphanNodes: number;
  };
}

export const canvasValidateTool = defineTool({
  name: "canvas_validate",
  description:
    "Validate the workflow for completeness and correctness. Checks for required start/end nodes, unconnected nodes, and other structural issues.",
  category: "canvas",
  parameters: z.object({}),
  stakes: "low",
  reversibility: "easy",
  execute: (_params, ctx) => {
    const nodes = ctx.canvasState?.nodes ?? [];
    const edges = ctx.canvasState?.edges ?? [];

    const issues: string[] = [];

    const startNodes = nodes.filter((n) => n.type === "start");
    const endNodes = nodes.filter((n) => n.type === "end");

    if (startNodes.length === 0) {
      issues.push("Workflow must have a start node");
    }
    if (startNodes.length > 1) {
      issues.push("Workflow should have only one start node");
    }
    if (endNodes.length === 0) {
      issues.push("Workflow must have at least one end node");
    }

    const connectedNodeIds = new Set<string>();
    const nodeIdSet = new Set(nodes.map((node) => node.id));
    const incomingEdgeCount = new Map<string, number>();
    const outgoingEdgeCount = new Map<string, number>();

    for (const edge of edges) {
      if (!(nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target))) {
        issues.push(
          `Edge ${edge.id} references a missing source or target node`
        );
        continue;
      }

      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);

      outgoingEdgeCount.set(
        edge.source,
        (outgoingEdgeCount.get(edge.source) ?? 0) + 1
      );
      incomingEdgeCount.set(
        edge.target,
        (incomingEdgeCount.get(edge.target) ?? 0) + 1
      );
    }

    const orphanNodes = nodes.filter(
      (n) =>
        !connectedNodeIds.has(n.id) &&
        n.type !== "start" &&
        n.type !== "annotation"
    );

    if (orphanNodes.length > 0) {
      issues.push(["Found", orphanNodes.length, "unconnected nodes"].join(" "));
    }

    const invalidStartNodes = startNodes.filter(
      (node) => (incomingEdgeCount.get(node.id) ?? 0) > 0
    );
    if (invalidStartNodes.length > 0) {
      issues.push("Start node cannot have incoming connections");
    }

    const invalidEndNodes = endNodes.filter(
      (node) => (outgoingEdgeCount.get(node.id) ?? 0) > 0
    );
    if (invalidEndNodes.length > 0) {
      issues.push("End node cannot have outgoing connections");
    }

    const result: ValidationResult = {
      valid: issues.length === 0,
      issues,
      stats: {
        nodes: nodes.length,
        edges: edges.length,
        startNodes: startNodes.length,
        endNodes: endNodes.length,
        orphanNodes: orphanNodes.length,
      },
    };

    return success(result);
  },
});
