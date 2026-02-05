import {
  type AgentCanvasEdge,
  type AgentCanvasNode,
  type CanvasNodeType,
  type CanvasState,
  CanvasStateSchema,
  type CanvasValidationResult,
  CanvasValidationResultSchema,
  type ExecutionPlan,
  type ExecutionPlanNode,
  ExecutionPlanSchema,
  type StrictAgentCanvasEdge,
  StrictAgentCanvasEdgeSchema,
  type StrictAgentCanvasNode,
  StrictAgentCanvasNodeSchema,
} from "@openplane/types/canvas";

const DEFAULT_EDGE_TYPE = "data";
const ORPHAN_EXCLUSIONS = new Set<CanvasNodeType>(["annotation"]);
const ENTRY_NODE_TYPES = new Set<CanvasNodeType>([
  "start",
  "trigger_manual",
  "trigger_schedule",
  "trigger_webhook",
  "trigger_event",
]);

interface PreparedCanvas {
  nodes: StrictAgentCanvasNode[];
  edges: StrictAgentCanvasEdge[];
  issues: string[];
  stats: {
    nodes: number;
    edges: number;
  };
}

export class CanvasValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super("Canvas validation failed");
    this.issues = issues;
  }
}

function normalizeNodes(nodes: AgentCanvasNode[]): {
  nodes: StrictAgentCanvasNode[];
  issues: string[];
  nodeIds: Set<string>;
} {
  const issues: string[] = [];
  const nodeIds = new Set<string>();
  const normalized: StrictAgentCanvasNode[] = [];

  for (const node of nodes) {
    if (!node.id) {
      issues.push("Node missing id");
      continue;
    }

    if (nodeIds.has(node.id)) {
      issues.push(`Duplicate node id: ${node.id}`);
      continue;
    }

    const parsed = StrictAgentCanvasNodeSchema.safeParse(node);
    if (!parsed.success) {
      issues.push(`Invalid node: ${node.id}`);
      continue;
    }

    nodeIds.add(node.id);
    normalized.push(parsed.data);
  }

  return { nodes: normalized, issues, nodeIds };
}

function normalizeEdges(
  edges: AgentCanvasEdge[],
  nodeIds: Set<string>
): {
  edges: StrictAgentCanvasEdge[];
  issues: string[];
} {
  const issues: string[] = [];
  const normalized: StrictAgentCanvasEdge[] = [];

  for (const edge of edges) {
    if (!(nodeIds.has(edge.source) && nodeIds.has(edge.target))) {
      issues.push(`Edge references missing node: ${edge.id}`);
      continue;
    }

    const parsed = StrictAgentCanvasEdgeSchema.safeParse({
      ...edge,
      type: edge.type ?? DEFAULT_EDGE_TYPE,
    });

    if (!parsed.success) {
      issues.push(`Invalid edge: ${edge.id}`);
      continue;
    }

    normalized.push(parsed.data);
  }

  return { edges: normalized, issues };
}

function prepareCanvas(state: CanvasState): PreparedCanvas {
  const nodeResult = normalizeNodes(state.nodes);
  const edgeResult = normalizeEdges(state.edges, nodeResult.nodeIds);

  return {
    nodes: nodeResult.nodes,
    edges: edgeResult.edges,
    issues: [...nodeResult.issues, ...edgeResult.issues],
    stats: {
      nodes: state.nodes.length,
      edges: state.edges.length,
    },
  };
}

function buildAdjacency(
  nodeIds: Set<string>,
  edges: StrictAgentCanvasEdge[]
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

function findReachable(
  startNodeId: string,
  outbound: Map<string, Set<string>>
): Set<string> {
  const visited = new Set<string>();
  const queue = [startNodeId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    const targets = outbound.get(current);
    if (!targets) {
      continue;
    }

    for (const target of targets) {
      if (!visited.has(target)) {
        queue.push(target);
      }
    }
  }

  return visited;
}

function detectCycles(outbound: Map<string, Set<string>>): string[][] {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(nodeId: string, path: string[]): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const targets = outbound.get(nodeId);
    if (targets) {
      for (const target of targets) {
        if (!visited.has(target)) {
          dfs(target, path);
        } else if (recursionStack.has(target)) {
          const cycleStart = path.indexOf(target);
          const cyclePath = [...path.slice(cycleStart), target];
          cycles.push(cyclePath);
        }
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
  }

  for (const nodeId of outbound.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId, []);
    }
  }

  return cycles;
}

function computeNodeOrder(
  startNodeId: string,
  outbound: Map<string, Set<string>>,
  nodes: StrictAgentCanvasNode[]
): string[] {
  const reachable = findReachable(startNodeId, outbound);
  const order: string[] = [];
  const queue = [startNodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);
    order.push(current);

    const targets = outbound.get(current);
    if (!targets) {
      continue;
    }

    for (const target of targets) {
      if (!visited.has(target)) {
        queue.push(target);
      }
    }
  }

  const remaining = nodes
    .map((node) => node.id)
    .filter((nodeId) => !reachable.has(nodeId));

  return [...order, ...remaining];
}

function buildValidationResult(
  state: CanvasState,
  prepared: PreparedCanvas
): CanvasValidationResult {
  const issues: string[] = [...prepared.issues];
  const startNodes = prepared.nodes.filter((node) =>
    ENTRY_NODE_TYPES.has(node.type)
  );
  const endNodes = prepared.nodes.filter((node) => node.type === "end");

  if (startNodes.length === 0) {
    issues.push("Workflow must have a start or trigger node");
  }
  if (startNodes.length > 1) {
    issues.push("Workflow must have exactly one start or trigger node");
  }
  if (endNodes.length === 0) {
    issues.push("Workflow must have at least one end node");
  }

  const nodeIds = new Set(prepared.nodes.map((node) => node.id));
  const adjacency = buildAdjacency(nodeIds, prepared.edges);

  const orphanNodes = prepared.nodes.filter((node) => {
    if (ORPHAN_EXCLUSIONS.has(node.type)) {
      return false;
    }

    const inbound = adjacency.inbound.get(node.id);
    const outbound = adjacency.outbound.get(node.id);

    return (
      (!inbound || inbound.size === 0) && (!outbound || outbound.size === 0)
    );
  });

  if (orphanNodes.length > 0) {
    issues.push(`Unconnected nodes: ${orphanNodes.length}`);
  }

  const startNode = startNodes.length === 1 ? startNodes[0] : undefined;
  const reachable = startNode
    ? findReachable(startNode.id, adjacency.outbound)
    : new Set<string>();

  const unreachableNodes = prepared.nodes.filter(
    (node) =>
      !(reachable.has(node.id) || ORPHAN_EXCLUSIONS.has(node.type)) &&
      startNodes.length === 1
  );

  if (unreachableNodes.length > 0) {
    issues.push(`Unreachable nodes: ${unreachableNodes.length}`);
  }

  const cycles = detectCycles(adjacency.outbound);
  for (const cycle of cycles) {
    issues.push(`Cycle detected: ${cycle.join(" → ")}`);
  }

  return CanvasValidationResultSchema.parse({
    valid: issues.length === 0,
    issues,
    stats: {
      nodes: state.nodes.length,
      edges: state.edges.length,
      startNodes: startNodes.length,
      endNodes: endNodes.length,
      orphanNodes: orphanNodes.length,
      unreachableNodes: unreachableNodes.length,
      cycleCount: cycles.length,
    },
  });
}

export function validateCanvasGraph(
  state: CanvasState
): CanvasValidationResult {
  const prepared = prepareCanvas(state);
  return buildValidationResult(state, prepared);
}

export function compileCanvasPlan(input: unknown): ExecutionPlan {
  const state = CanvasStateSchema.parse(input);
  const prepared = prepareCanvas(state);
  const validation = buildValidationResult(state, prepared);

  if (!validation.valid) {
    throw new CanvasValidationError(validation.issues);
  }

  const nodeIds = new Set(prepared.nodes.map((node) => node.id));
  const adjacency = buildAdjacency(nodeIds, prepared.edges);
  const startNodeId = prepared.nodes.find((node) =>
    ENTRY_NODE_TYPES.has(node.type)
  )?.id;
  const endNodeIds = prepared.nodes
    .filter((node) => node.type === "end")
    .map((node) => node.id);

  if (!startNodeId) {
    throw new CanvasValidationError([
      "Workflow must have a start or trigger node",
    ]);
  }

  const planNodes: ExecutionPlanNode[] = prepared.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    data: node.data,
    inbound: Array.from(adjacency.inbound.get(node.id) ?? []),
    outbound: Array.from(adjacency.outbound.get(node.id) ?? []),
  }));

  const plan: ExecutionPlan = {
    version: 1,
    startNodeId,
    endNodeIds,
    nodes: planNodes,
    edges: prepared.edges,
    nodeOrder: computeNodeOrder(
      startNodeId,
      adjacency.outbound,
      prepared.nodes
    ),
  };

  return ExecutionPlanSchema.parse(plan);
}
