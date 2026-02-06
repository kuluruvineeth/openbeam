import type { ExecutionPlanNode } from "@openplane/types/canvas";

export type NodeVisitor<T> = (node: ExecutionPlanNode, depth: number) => T;

export type GetNextNodeIds = (node: ExecutionPlanNode) => string[];

export type ShouldStop = (nodeId: string, depth: number) => boolean;

export interface BfsTraverseOptions {
  shouldStop?: ShouldStop;
  maxDepth?: number;
}

// biome-ignore lint/nursery/useMaxParams: graph traversal function requires all parameters
export function bfsTraverse<T>(
  startNodeId: string,
  nodes: ExecutionPlanNode[],
  getNextNodeIds: GetNextNodeIds,
  visitor: NodeVisitor<T>,
  options?: BfsTraverseOptions
): T[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  const results: T[] = [];
  const queue: Array<{ nodeId: string; depth: number }> = [
    { nodeId: startNodeId, depth: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    if (visited.has(current.nodeId)) {
      continue;
    }

    if (options?.maxDepth !== undefined && current.depth > options.maxDepth) {
      continue;
    }

    visited.add(current.nodeId);

    const node = nodeMap.get(current.nodeId);
    if (!node) {
      continue;
    }

    results.push(visitor(node, current.depth));

    if (options?.shouldStop?.(current.nodeId, current.depth)) {
      continue;
    }

    for (const nextId of getNextNodeIds(node)) {
      if (!visited.has(nextId)) {
        queue.push({ nodeId: nextId, depth: current.depth + 1 });
      }
    }
  }

  return results;
}

export function dfsTraverse<T>(
  startNodeId: string,
  nodes: ExecutionPlanNode[],
  getNextNodeIds: GetNextNodeIds,
  visitor: NodeVisitor<T>
): T[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  const results: T[] = [];

  function dfs(nodeId: string, depth: number): void {
    if (visited.has(nodeId)) {
      return;
    }
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) {
      return;
    }

    results.push(visitor(node, depth));

    for (const nextId of getNextNodeIds(node)) {
      dfs(nextId, depth + 1);
    }
  }

  dfs(startNodeId, 0);
  return results;
}

export function findAllPathsBetween(
  startNodeId: string,
  endNodeId: string,
  nodes: ExecutionPlanNode[],
  getNextNodeIds: GetNextNodeIds
): string[][] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const paths: string[][] = [];

  function dfs(currentId: string, path: string[]): void {
    if (currentId === endNodeId) {
      paths.push([...path]);
      return;
    }

    const node = nodeMap.get(currentId);
    if (!node) {
      return;
    }

    for (const nextId of getNextNodeIds(node)) {
      if (!path.includes(nextId)) {
        path.push(nextId);
        dfs(nextId, path);
        path.pop();
      }
    }
  }

  dfs(startNodeId, [startNodeId]);
  return paths;
}

export function getReachableNodes(
  startNodeId: string,
  nodes: ExecutionPlanNode[],
  getNextNodeIds: GetNextNodeIds
): Set<string> {
  const reachable = new Set<string>();
  bfsTraverse(startNodeId, nodes, getNextNodeIds, (node) => {
    reachable.add(node.id);
    return node.id;
  });
  return reachable;
}

export function findShortestPath(
  startNodeId: string,
  endNodeId: string,
  nodes: ExecutionPlanNode[],
  getNextNodeIds: GetNextNodeIds
): string[] | null {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  const parent = new Map<string, string>();
  const queue: string[] = [startNodeId];

  visited.add(startNodeId);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    if (current === endNodeId) {
      const path: string[] = [];
      let node: string | undefined = endNodeId;
      while (node) {
        path.unshift(node);
        node = parent.get(node);
      }
      return path;
    }

    const node = nodeMap.get(current);
    if (!node) {
      continue;
    }

    for (const nextId of getNextNodeIds(node)) {
      if (!visited.has(nextId)) {
        visited.add(nextId);
        parent.set(nextId, current);
        queue.push(nextId);
      }
    }
  }

  return null;
}

export function collectNodesByDepth(
  startNodeId: string,
  nodes: ExecutionPlanNode[],
  getNextNodeIds: GetNextNodeIds
): Map<number, string[]> {
  const depthMap = new Map<number, string[]>();
  bfsTraverse(startNodeId, nodes, getNextNodeIds, (node, depth) => {
    const nodesAtDepth = depthMap.get(depth) ?? [];
    nodesAtDepth.push(node.id);
    depthMap.set(depth, nodesAtDepth);
    return node.id;
  });
  return depthMap;
}

export function hasCycle(
  nodes: ExecutionPlanNode[],
  getNextNodeIds: GetNextNodeIds
): boolean {
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function detectCycle(nodeId: string): boolean {
    if (recStack.has(nodeId)) {
      return true;
    }
    if (visited.has(nodeId)) {
      return false;
    }

    visited.add(nodeId);
    recStack.add(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      for (const nextId of getNextNodeIds(node)) {
        if (detectCycle(nextId)) {
          return true;
        }
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (detectCycle(node.id)) {
      return true;
    }
  }

  return false;
}
