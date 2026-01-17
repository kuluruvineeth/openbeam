import type { BaseNodeData } from "@openplane/types/canvas";
import type { Edge, Node } from "@xyflow/react";

export type DetectedPattern =
  | { type: "sequential"; nodes: string[] }
  | {
      type: "parallel";
      splitNode: string;
      joinNode: string;
      branches: string[][];
    }
  | { type: "loop"; loopNode: string; bodyNodes: string[] }
  | {
      type: "condition";
      conditionNode: string;
      trueBranch: string[];
      falseBranch: string[];
    }
  | { type: "rag"; ragNode: string; llmNode: string }
  | {
      type: "generator-critic";
      generatorNode: string;
      criticNode: string;
      maxIterations: number;
    };

interface Graph {
  nodes: Map<string, Node<BaseNodeData>>;
  edges: Map<string, Edge[]>;
  reverseEdges: Map<string, Edge[]>;
}

export function detectPatterns(
  nodes: Node<BaseNodeData>[],
  edges: Edge[]
): DetectedPattern[] {
  const graph = buildGraph(nodes, edges);
  const patterns: DetectedPattern[] = [];

  patterns.push(...detectParallelPatterns(graph));
  patterns.push(...detectLoopPatterns(graph));
  patterns.push(...detectConditionPatterns(graph));
  patterns.push(...detectRagPatterns(graph));
  patterns.push(...detectGeneratorCriticPatterns(graph));

  return patterns;
}

function buildGraph(nodes: Node<BaseNodeData>[], edges: Edge[]): Graph {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edgeMap = new Map<string, Edge[]>();
  const reverseEdgeMap = new Map<string, Edge[]>();

  for (const edge of edges) {
    const sourceEdges = edgeMap.get(edge.source) ?? [];
    sourceEdges.push(edge);
    edgeMap.set(edge.source, sourceEdges);

    const targetEdges = reverseEdgeMap.get(edge.target) ?? [];
    targetEdges.push(edge);
    reverseEdgeMap.set(edge.target, targetEdges);
  }

  return { nodes: nodeMap, edges: edgeMap, reverseEdges: reverseEdgeMap };
}

function findJoinNodeForBranch(graph: Graph, branch: string[]): string | null {
  const lastNodeId = branch.at(-1);
  if (!lastNodeId) {
    return null;
  }

  const lastNodeOutEdges = graph.edges.get(lastNodeId) ?? [];
  for (const outEdge of lastNodeOutEdges) {
    const targetNode = graph.nodes.get(outEdge.target);
    if (targetNode?.type === "parallelJoin") {
      return outEdge.target;
    }
  }
  return null;
}

function findJoinNodeForBranches(
  graph: Graph,
  branches: string[][]
): string | null {
  let joinNode: string | null = null;

  for (const branch of branches) {
    const branchJoinNode = findJoinNodeForBranch(graph, branch);
    if (branchJoinNode === null) {
      continue;
    }
    if (joinNode === null) {
      joinNode = branchJoinNode;
    } else if (joinNode !== branchJoinNode) {
      return null;
    }
  }

  return joinNode;
}

function detectParallelPatterns(graph: Graph): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  for (const [nodeId, node] of graph.nodes) {
    if (node.type !== "parallelSplit") {
      continue;
    }

    const outEdges = graph.edges.get(nodeId) ?? [];
    if (outEdges.length < 2) {
      continue;
    }

    const branches: string[][] = outEdges.map((edge) =>
      traceBranch(graph, edge.target)
    );

    const joinNode = findJoinNodeForBranches(graph, branches);

    if (joinNode && branches.length >= 2) {
      patterns.push({
        type: "parallel",
        splitNode: nodeId,
        joinNode,
        branches,
      });
    }
  }

  return patterns;
}

function detectLoopPatterns(graph: Graph): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  for (const [nodeId, node] of graph.nodes) {
    if (node.type !== "loop") {
      continue;
    }

    const outEdges = graph.edges.get(nodeId) ?? [];
    const bodyEdge = outEdges.find((e) => e.sourceHandle?.includes("body"));

    if (bodyEdge) {
      const bodyNodes = traceBranchUntilReturn(graph, bodyEdge.target, nodeId);
      patterns.push({
        type: "loop",
        loopNode: nodeId,
        bodyNodes,
      });
    }
  }

  return patterns;
}

function detectConditionPatterns(graph: Graph): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  for (const [nodeId, node] of graph.nodes) {
    if (node.type !== "condition") {
      continue;
    }

    const outEdges = graph.edges.get(nodeId) ?? [];
    const trueEdge = outEdges.find((e) => e.sourceHandle?.includes("true"));
    const falseEdge = outEdges.find((e) => e.sourceHandle?.includes("false"));

    if (trueEdge && falseEdge) {
      patterns.push({
        type: "condition",
        conditionNode: nodeId,
        trueBranch: traceBranch(graph, trueEdge.target),
        falseBranch: traceBranch(graph, falseEdge.target),
      });
    }
  }

  return patterns;
}

function detectRagPatterns(graph: Graph): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  for (const [nodeId, node] of graph.nodes) {
    if (node.type !== "rag") {
      continue;
    }

    const outEdges = graph.edges.get(nodeId) ?? [];
    for (const edge of outEdges) {
      const targetNode = graph.nodes.get(edge.target);
      if (targetNode?.type === "llm") {
        patterns.push({
          type: "rag",
          ragNode: nodeId,
          llmNode: edge.target,
        });
      }
    }
  }

  return patterns;
}

function isGeneratorNode(node: Node<BaseNodeData>): boolean {
  return (
    node.type === "llm" &&
    Boolean(node.data.label?.toLowerCase().includes("generator"))
  );
}

function isCriticNode(node: Node<BaseNodeData>): boolean {
  return Boolean(node.data.label?.toLowerCase().includes("critic"));
}

function detectGeneratorCriticPatterns(graph: Graph): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  for (const [nodeId, node] of graph.nodes) {
    if (!isGeneratorNode(node)) {
      continue;
    }

    const outEdges = graph.edges.get(nodeId) ?? [];
    for (const edge of outEdges) {
      const targetNode = graph.nodes.get(edge.target);
      if (targetNode?.type === "llm" && isCriticNode(targetNode)) {
        const backEdges = graph.edges.get(edge.target) ?? [];
        const hasLoop = backEdges.some((e) => e.target === nodeId);

        patterns.push({
          type: "generator-critic",
          generatorNode: nodeId,
          criticNode: edge.target,
          maxIterations: hasLoop ? 3 : 1,
        });
      }
    }
  }

  return patterns;
}

function traceBranch(graph: Graph, startNodeId: string): string[] {
  const branch: string[] = [];
  let currentId: string | null = startNodeId;
  const visited = new Set<string>();

  while (currentId !== null && !visited.has(currentId)) {
    const nodeId = currentId;
    visited.add(nodeId);
    branch.push(nodeId);

    const edgeList = graph.edges.get(nodeId);
    const nodeEdges = edgeList ?? [];
    if (nodeEdges.length === 1) {
      const edge = nodeEdges[0];
      currentId = edge ? edge.target : null;
    } else {
      currentId = null;
    }
  }

  return branch;
}

function traceBranchUntilReturn(
  graph: Graph,
  startNodeId: string,
  returnNodeId: string
): string[] {
  const branch: string[] = [];
  let currentId: string | null = startNodeId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId) && currentId !== returnNodeId) {
    const nodeId = currentId;
    visited.add(nodeId);
    branch.push(nodeId);

    const edgeList = graph.edges.get(nodeId);
    const nodeEdges = edgeList ?? [];
    if (nodeEdges.length >= 1) {
      const firstEdge = nodeEdges[0];
      currentId = firstEdge ? firstEdge.target : null;
    } else {
      break;
    }
  }

  return branch;
}

function processTopologicalQueue(
  queue: string[],
  graph: Graph,
  inDegree: Map<string, number>,
  result: string[]
): void {
  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId) {
      continue;
    }

    result.push(nodeId);

    const nodeOutEdges = graph.edges.get(nodeId) ?? [];
    for (const edge of nodeOutEdges) {
      const newDegree = (inDegree.get(edge.target) ?? 1) - 1;
      inDegree.set(edge.target, newDegree);
      if (newDegree === 0) {
        queue.push(edge.target);
      }
    }
  }
}

export function getTopologicalOrder(
  nodes: Node<BaseNodeData>[],
  edges: Edge[]
): string[] {
  const graph = buildGraph(nodes, edges);
  const inDegree = new Map<string, number>();
  const result: string[] = [];

  for (const nodeId of graph.nodes.keys()) {
    inDegree.set(nodeId, 0);
  }

  for (const edgeList of graph.edges.values()) {
    for (const edge of edgeList) {
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  processTopologicalQueue(queue, graph, inDegree, result);

  return result;
}
