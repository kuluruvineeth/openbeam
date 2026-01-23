import { z } from "zod";
import { defineTool, success } from "../../builder";

interface NodeSummary {
  id: string;
  type: string;
  label: string | undefined;
}

interface EdgeSummary {
  id: string;
  source: string;
  target: string;
}

interface CanvasStateSummary {
  nodeCount: number;
  edgeCount: number;
  nodes: NodeSummary[];
  edges: EdgeSummary[];
}

export const canvasGetStateTool = defineTool({
  name: "canvas_get_state",
  description:
    "Get the current canvas state including all nodes and edges. Use this to understand the workflow structure before making changes.",
  category: "canvas",
  parameters: z.object({}),
  stakes: "low",
  reversibility: "easy",
  execute: (_params, ctx) => {
    const nodes = ctx.canvasState?.nodes ?? [];
    const edges = ctx.canvasState?.edges ?? [];

    const nodeSummaries: NodeSummary[] = nodes.map((n) => ({
      id: n.id,
      type: String(n.type ?? "unknown"),
      label: n.data?.label as string | undefined,
    }));

    const edgeSummaries: EdgeSummary[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }));

    const result: CanvasStateSummary = {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      nodes: nodeSummaries,
      edges: edgeSummaries,
    };

    return success(result);
  },
});
