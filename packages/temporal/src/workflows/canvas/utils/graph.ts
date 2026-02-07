import type { ExecutionPlan, ExecutionPlanNode } from "@openplane/types/canvas";

const IGNORED_NODE_TYPES = new Set(["annotation"]);

export function getExecutableNodes(plan: ExecutionPlan): ExecutionPlanNode[] {
  return plan.nodes.filter((node) => !IGNORED_NODE_TYPES.has(node.type));
}

export function buildNodeIndex(
  nodes: ExecutionPlanNode[]
): Map<string, ExecutionPlanNode> {
  return new Map(nodes.map((node) => [node.id, node]));
}

export function getExecutableEdges(
  plan: ExecutionPlan
): ExecutionPlan["edges"] {
  const nodeIds = new Set(getExecutableNodes(plan).map((node) => node.id));

  return plan.edges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );
}

export function buildEdgeIndex(edges: ExecutionPlan["edges"]): {
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  edgesByTarget: Map<string, ExecutionPlan["edges"]>;
} {
  const edgesBySource = new Map<string, ExecutionPlan["edges"]>();
  const edgesByTarget = new Map<string, ExecutionPlan["edges"]>();

  for (const edge of edges) {
    const outbound = edgesBySource.get(edge.source);
    if (outbound) {
      outbound.push(edge);
    } else {
      edgesBySource.set(edge.source, [edge]);
    }

    const inbound = edgesByTarget.get(edge.target);
    if (inbound) {
      inbound.push(edge);
    } else {
      edgesByTarget.set(edge.target, [edge]);
    }
  }

  return { edgesBySource, edgesByTarget };
}

export interface ExecutionGraph {
  nodesById: Map<string, ExecutionPlanNode>;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  edgesByTarget: Map<string, ExecutionPlan["edges"]>;
}

export function buildExecutionGraph(plan: ExecutionPlan): ExecutionGraph {
  const nodes = getExecutableNodes(plan);
  const nodesById = buildNodeIndex(nodes);
  const edges = getExecutableEdges(plan);
  const { edgesBySource, edgesByTarget } = buildEdgeIndex(edges);

  return { nodesById, edgesBySource, edgesByTarget };
}

export function buildAdjacency(
  nodeIds: Set<string>,
  edges: ExecutionPlan["edges"]
): {
  inbound: Map<string, Set<string>>;
  outbound: Map<string, Set<string>>;
} {
  const inbound = new Map<string, Set<string>>();
  const outbound = new Map<string, Set<string>>();

  for (const nodeId of nodeIds) {
    inbound.set(nodeId, new Set());
    outbound.set(nodeId, new Set());
  }

  for (const edge of edges) {
    const outboundSet = outbound.get(edge.source);
    const inboundSet = inbound.get(edge.target);

    if (outboundSet && inboundSet) {
      outboundSet.add(edge.target);
      inboundSet.add(edge.source);
    }
  }

  return { inbound, outbound };
}

export function containsInvalidCycle(
  nodeIds: Set<string>,
  outbound: Map<string, Set<string>>,
  nodeTypes: Map<string, ExecutionPlanNode["type"]>
): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const visit = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) {
      const cycleStart = stack.indexOf(nodeId);
      const cycleNodes = cycleStart >= 0 ? stack.slice(cycleStart) : [nodeId];
      const hasLoop = cycleNodes.some((id) => nodeTypes.get(id) === "loop");
      return !hasLoop;
    }
    if (visited.has(nodeId)) {
      return false;
    }

    visiting.add(nodeId);
    stack.push(nodeId);
    for (const next of outbound.get(nodeId) ?? []) {
      if (visit(next)) {
        return true;
      }
    }
    stack.pop();
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  };

  for (const nodeId of nodeIds) {
    if (visit(nodeId)) {
      return true;
    }
  }

  return false;
}
