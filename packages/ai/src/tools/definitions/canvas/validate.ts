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
    for (const edge of edges) {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
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
