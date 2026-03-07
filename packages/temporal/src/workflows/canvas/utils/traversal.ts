import type { ExecutionPlan, ExecutionPlanNode } from "@openbeam/types/canvas";

import { buildAdjacency, getExecutableNodes } from "./graph";
import { bfsTraverse } from "./graph-traversal";

const ENTRY_NODE_TYPES = new Set([
  "start",
  "trigger_manual",
  "trigger_schedule",
  "trigger_webhook",
  "trigger_event",
]);

export type Adjacency = {
  inbound: Map<string, Set<string>>;
  outbound: Map<string, Set<string>>;
};

export function findStartNodes(plan: ExecutionPlan): ExecutionPlanNode[] {
  return getExecutableNodes(plan).filter((node) =>
    ENTRY_NODE_TYPES.has(node.type)
  );
}

export function findEndNodes(plan: ExecutionPlan): ExecutionPlanNode[] {
  return getExecutableNodes(plan).filter((node) => node.type === "end");
}

export function getNextNodes(
  nodeId: string,
  edgesBySource: Map<string, ExecutionPlan["edges"]>
): string[] {
  const edges = edgesBySource.get(nodeId) ?? [];
  return edges.map((edge) => edge.target);
}

export function getPreviousNodes(
  nodeId: string,
  edgesByTarget: Map<string, ExecutionPlan["edges"]>
): string[] {
  const edges = edgesByTarget.get(nodeId) ?? [];
  return edges.map((edge) => edge.source);
}

export function getOutboundEdges(
  nodeId: string,
  edgesBySource: Map<string, ExecutionPlan["edges"]>
): ExecutionPlan["edges"] {
  return edgesBySource.get(nodeId) ?? [];
}

export function getInboundEdges(
  nodeId: string,
  edgesByTarget: Map<string, ExecutionPlan["edges"]>
): ExecutionPlan["edges"] {
  return edgesByTarget.get(nodeId) ?? [];
}

export function collectReachableNodes(
  startNodeId: string,
  edgesBySource: Map<string, ExecutionPlan["edges"]>
): Set<string> {
  const visited = new Set<string>();

  const allNodeIds = new Set<string>();
  for (const sourceId of edgesBySource.keys()) {
    allNodeIds.add(sourceId);
    const edges = edgesBySource.get(sourceId) ?? [];
    for (const edge of edges) {
      allNodeIds.add(edge.target);
    }
  }

  const planNodes: ExecutionPlanNode[] = Array.from(allNodeIds).map((id) => ({
    id,
    type: "tool",
    position: { x: 0, y: 0 },
    data: {},
    inbound: [] as string[],
    outbound: [] as string[],
  }));

  bfsTraverse(
    startNodeId,
    planNodes,
    (node) => {
      const edges = edgesBySource.get(node.id) ?? [];
      return edges.map((edge) => edge.target);
    },
    (node) => {
      visited.add(node.id);
      return node.id;
    }
  );

  return visited;
}

export function collectReachableNodesReverse(
  startNodeId: string,
  edgesByTarget: Map<string, ExecutionPlan["edges"]>
): Set<string> {
  const visited = new Set<string>();

  const allNodeIds = new Set<string>();
  for (const targetId of edgesByTarget.keys()) {
    allNodeIds.add(targetId);
    const edges = edgesByTarget.get(targetId) ?? [];
    for (const edge of edges) {
      allNodeIds.add(edge.source);
    }
  }

  const planNodes: ExecutionPlanNode[] = Array.from(allNodeIds).map((id) => ({
    id,
    type: "tool",
    position: { x: 0, y: 0 },
    data: {},
    inbound: [] as string[],
    outbound: [] as string[],
  }));

  bfsTraverse(
    startNodeId,
    planNodes,
    (node) => {
      const edges = edgesByTarget.get(node.id) ?? [];
      return edges.map((edge) => edge.source);
    },
    (node) => {
      visited.add(node.id);
      return node.id;
    }
  );

  return visited;
}

export function findClosestJoinIds(
  startNodeId: string,
  nodesById: Map<string, ExecutionPlanNode>,
  edgesBySource: Map<string, ExecutionPlan["edges"]>
): Set<string> {
  const joinIds = new Set<string>();
  let minDepth = Number.POSITIVE_INFINITY;

  const planNodes = Array.from(nodesById.values());

  bfsTraverse(
    startNodeId,
    planNodes,
    (node) => {
      const edges = edgesBySource.get(node.id) ?? [];
      return edges.map((edge) => edge.target);
    },
    (node, depth) => {
      if (node.type === "parallel_join") {
        if (depth < minDepth) {
          minDepth = depth;
          joinIds.clear();
        }
        if (depth === minDepth) {
          joinIds.add(node.id);
        }
      }
      return node.id;
    },
    {
      shouldStop: (_, depth) => depth > minDepth,
    }
  );

  return joinIds;
}

export function findClosestNodeOfType(
  startNodeId: string,
  targetType: ExecutionPlanNode["type"],
  nodesById: Map<string, ExecutionPlanNode>,
  edgesBySource: Map<string, ExecutionPlan["edges"]>
): string | null {
  let closestId: string | null = null;
  let minDepth = Number.POSITIVE_INFINITY;

  const planNodes = Array.from(nodesById.values());

  bfsTraverse(
    startNodeId,
    planNodes,
    (node) => {
      const edges = edgesBySource.get(node.id) ?? [];
      return edges.map((edge) => edge.target);
    },
    (node, depth) => {
      if (node.type === targetType && depth < minDepth) {
        minDepth = depth;
        closestId = node.id;
      }
      return node.id;
    },
    {
      shouldStop: (_, depth) => depth > minDepth,
    }
  );

  return closestId;
}

export function topologicalSort(
  nodeIds: Set<string>,
  adjacency: Adjacency
): string[] {
  const { inbound, outbound } = adjacency;
  const inDegree = new Map<string, number>();
  const result: string[] = [];
  const queue: string[] = [];

  for (const nodeId of nodeIds) {
    const degree = inbound.get(nodeId)?.size ?? 0;
    inDegree.set(nodeId, degree);
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    result.push(current);
    const successors = outbound.get(current) ?? new Set();
    for (const successor of successors) {
      const newDegree = (inDegree.get(successor) ?? 1) - 1;
      inDegree.set(successor, newDegree);
      if (newDegree === 0) {
        queue.push(successor);
      }
    }
  }

  return result;
}

export function topologicalSortFromPlan(plan: ExecutionPlan): string[] {
  const nodes = getExecutableNodes(plan);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const adjacency = buildAdjacency(nodeIds, plan.edges);
  return topologicalSort(nodeIds, adjacency);
}

export function hasPath(
  fromNodeId: string,
  toNodeId: string,
  edgesBySource: Map<string, ExecutionPlan["edges"]>
): boolean {
  if (fromNodeId === toNodeId) {
    return true;
  }
  const reachable = collectReachableNodes(fromNodeId, edgesBySource);
  return reachable.has(toNodeId);
}

export function findAllPaths(
  fromNodeId: string,
  toNodeId: string,
  edgesBySource: Map<string, ExecutionPlan["edges"]>,
  maxDepth = 100
): string[][] {
  const paths: string[][] = [];
  const stack: Array<{ nodeId: string; path: string[]; visited: Set<string> }> =
    [
      {
        nodeId: fromNodeId,
        path: [fromNodeId],
        visited: new Set([fromNodeId]),
      },
    ];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    if (current.path.length > maxDepth) {
      continue;
    }
    if (current.nodeId === toNodeId) {
      paths.push(current.path);
      continue;
    }
    const edges = edgesBySource.get(current.nodeId) ?? [];
    for (const edge of edges) {
      if (!current.visited.has(edge.target)) {
        const newVisited = new Set(current.visited);
        newVisited.add(edge.target);
        stack.push({
          nodeId: edge.target,
          path: [...current.path, edge.target],
          visited: newVisited,
        });
      }
    }
  }

  return paths;
}

export function getNodesInOrder(
  startNodeId: string,
  endNodeId: string,
  edgesBySource: Map<string, ExecutionPlan["edges"]>
): string[] {
  const allNodeIds = new Set<string>();
  for (const sourceId of edgesBySource.keys()) {
    allNodeIds.add(sourceId);
    const edges = edgesBySource.get(sourceId) ?? [];
    for (const edge of edges) {
      allNodeIds.add(edge.target);
    }
  }

  const planNodes: ExecutionPlanNode[] = Array.from(allNodeIds).map((id) => ({
    id,
    type: "tool",
    position: { x: 0, y: 0 },
    data: {},
    inbound: [] as string[],
    outbound: [] as string[],
  }));

  return bfsTraverse(
    startNodeId,
    planNodes,
    (node) => {
      const edges = edgesBySource.get(node.id) ?? [];
      return edges.map((edge) => edge.target);
    },
    (node) => node.id,
    {
      shouldStop: (nodeId) => nodeId === endNodeId,
    }
  );
}

export function getNodeDepths(
  startNodeId: string,
  edgesBySource: Map<string, ExecutionPlan["edges"]>
): Map<string, number> {
  const depths = new Map<string, number>();

  const allNodeIds = new Set<string>();
  for (const sourceId of edgesBySource.keys()) {
    allNodeIds.add(sourceId);
    const edges = edgesBySource.get(sourceId) ?? [];
    for (const edge of edges) {
      allNodeIds.add(edge.target);
    }
  }

  const planNodes: ExecutionPlanNode[] = Array.from(allNodeIds).map((id) => ({
    id,
    type: "tool",
    position: { x: 0, y: 0 },
    data: {},
    inbound: [] as string[],
    outbound: [] as string[],
  }));

  bfsTraverse(
    startNodeId,
    planNodes,
    (node) => {
      const edges = edgesBySource.get(node.id) ?? [];
      return edges.map((edge) => edge.target);
    },
    (node, depth) => {
      const existing = depths.get(node.id);
      if (existing === undefined || depth < existing) {
        depths.set(node.id, depth);
      }
      return node.id;
    }
  );

  return depths;
}

export function getNodesBetween(
  fromNodeId: string,
  toNodeId: string,
  edgesBySource: Map<string, ExecutionPlan["edges"]>,
  edgesByTarget: Map<string, ExecutionPlan["edges"]>
): Set<string> {
  const reachableFromStart = collectReachableNodes(fromNodeId, edgesBySource);
  const reachableFromEnd = collectReachableNodesReverse(
    toNodeId,
    edgesByTarget
  );
  const intersection = new Set<string>();

  for (const nodeId of reachableFromStart) {
    if (reachableFromEnd.has(nodeId)) {
      intersection.add(nodeId);
    }
  }

  return intersection;
}
