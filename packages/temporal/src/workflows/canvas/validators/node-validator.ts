import type { ExecutionPlanNode } from "@openplane/types/canvas";
import {
  isParallelMapTargetType,
  isRetryTargetType,
  isTryCatchCatchTargetType,
  isTryCatchTryTargetType,
} from "../utils/type-guards";
import {
  validateParallelMapConfig,
  validateSubWorkflowConfig,
  validateTryCatchConfig,
} from "./config-validator";

export function validateSubWorkflowNode(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  issues: string[];
}): void {
  const { node, inbound, outbound, issues } = params;

  if (inbound !== 1 || outbound !== 1) {
    issues.push(
      `Sub-workflow node ${node.id} must have 1 inbound and 1 outbound`
    );
    return;
  }

  validateSubWorkflowConfig(node, issues);
}

export function validateRetryNode(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  edgesBySource: Map<
    string,
    import("@openplane/types/canvas").ExecutionPlan["edges"]
  >;
  nodesById: Map<string, ExecutionPlanNode>;
  adjacency: {
    inbound: Map<string, Set<string>>;
    outbound: Map<string, Set<string>>;
  };
  issues: string[];
}): void {
  const {
    node,
    inbound,
    outbound,
    edgesBySource,
    nodesById,
    adjacency,
    issues,
  } = params;

  if (inbound !== 1 || outbound !== 1) {
    issues.push("Retry node must have 1 inbound and 1 outbound");
    return;
  }

  const outboundEdges = edgesBySource.get(node.id) ?? [];
  if (outboundEdges.length !== 1) {
    issues.push(`Retry node ${node.id} must have a single outbound edge`);
    return;
  }

  const targetId = outboundEdges[0]?.target;
  if (!targetId) {
    issues.push(`Retry node ${node.id} is missing target node`);
    return;
  }

  const targetNode = nodesById.get(targetId);
  if (!targetNode) {
    issues.push(`Retry node ${node.id} targets unknown node ${targetId}`);
    return;
  }

  if (!isRetryTargetType(targetNode.type)) {
    issues.push(
      `Retry node ${node.id} targets unsupported node type ${targetNode.type}`
    );
    return;
  }

  const targetInbound = adjacency.inbound.get(targetId)?.size ?? 0;
  if (targetInbound !== 1) {
    issues.push(`Retry target ${targetId} must have 1 inbound`);
  }

  const targetOutbound = adjacency.outbound.get(targetId)?.size ?? 0;
  if (targetOutbound !== 1) {
    issues.push(`Retry target ${targetId} must have 1 outbound`);
  }
}

export function validateTryCatchNode(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  edgesBySource: Map<
    string,
    import("@openplane/types/canvas").ExecutionPlan["edges"]
  >;
  nodesById: Map<string, ExecutionPlanNode>;
  adjacency: {
    inbound: Map<string, Set<string>>;
    outbound: Map<string, Set<string>>;
  };
  issues: string[];
}): void {
  const {
    node,
    inbound,
    outbound,
    edgesBySource,
    nodesById,
    adjacency,
    issues,
  } = params;

  if (inbound !== 1 || outbound !== 2) {
    issues.push("Try/catch node must have 1 inbound and 2 outbound");
    return;
  }

  const configResult = validateTryCatchConfig(node, issues);

  if (!configResult.success) {
    return;
  }

  const outboundEdges = edgesBySource.get(node.id) ?? [];
  const handles = new Set<string>();
  let tryEdge:
    | import("@openplane/types/canvas").ExecutionPlan["edges"][number]
    | undefined;
  let catchEdge:
    | import("@openplane/types/canvas").ExecutionPlan["edges"][number]
    | undefined;

  for (const edge of outboundEdges) {
    const handle = edge.sourceHandle ?? undefined;
    if (!handle) {
      issues.push(`Try/catch node ${node.id} has edge without handle`);
      continue;
    }
    if (handles.has(handle)) {
      issues.push(`Try/catch node ${node.id} has duplicate handle ${handle}`);
      continue;
    }
    handles.add(handle);
    if (handle === "try") {
      tryEdge = edge;
      continue;
    }
    if (handle === "catch") {
      catchEdge = edge;
      continue;
    }
    issues.push(`Try/catch node ${node.id} has unknown handle ${handle}`);
  }

  if (!tryEdge) {
    issues.push(`Try/catch node ${node.id} missing try branch`);
  }
  if (!catchEdge) {
    issues.push(`Try/catch node ${node.id} missing catch branch`);
  }

  if (!(tryEdge && catchEdge)) {
    return;
  }

  const tryNode = nodesById.get(tryEdge.target);
  const catchNode = nodesById.get(catchEdge.target);

  if (!tryNode) {
    issues.push(`Try/catch node ${node.id} has unknown try target`);
    return;
  }

  if (!catchNode) {
    issues.push(`Try/catch node ${node.id} has unknown catch target`);
    return;
  }

  if (tryNode.id === catchNode.id) {
    issues.push(`Try/catch node ${node.id} must not reuse the same target`);
  }

  if (!isTryCatchTryTargetType(tryNode.type)) {
    issues.push(
      `Try/catch node ${node.id} has unsupported try target ${tryNode.type}`
    );
  }

  if (!isTryCatchCatchTargetType(catchNode.type)) {
    issues.push(
      `Try/catch node ${node.id} has unsupported catch target ${catchNode.type}`
    );
  }

  const tryInbound = adjacency.inbound.get(tryNode.id)?.size ?? 0;
  const tryOutbound = adjacency.outbound.get(tryNode.id)?.size ?? 0;
  if (tryInbound !== 1 || tryOutbound !== 1) {
    issues.push(
      `Try node ${tryNode.id} must have 1 inbound and 1 outbound edge`
    );
  }

  const catchInbound = adjacency.inbound.get(catchNode.id)?.size ?? 0;
  const catchOutbound = adjacency.outbound.get(catchNode.id)?.size ?? 0;
  if (catchInbound !== 1) {
    issues.push(`Catch node ${catchNode.id} must have 1 inbound edge`);
  }
  if (catchNode.type === "end") {
    if (catchOutbound !== 0) {
      issues.push(`Catch end node ${catchNode.id} must have 0 outbound edges`);
    }
  } else if (catchOutbound !== 1) {
    issues.push(`Catch node ${catchNode.id} must have 1 outbound edge`);
  }
}

export function validateParallelMapNode(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  edgesBySource: Map<
    string,
    import("@openplane/types/canvas").ExecutionPlan["edges"]
  >;
  nodesById: Map<string, ExecutionPlanNode>;
  adjacency: {
    inbound: Map<string, Set<string>>;
    outbound: Map<string, Set<string>>;
  };
  issues: string[];
}): void {
  const {
    node,
    inbound,
    outbound,
    edgesBySource,
    nodesById,
    adjacency,
    issues,
  } = params;

  if (inbound !== 1 || outbound !== 1) {
    issues.push("Parallel map node must have 1 inbound and 1 outbound");
    return;
  }

  const configResult = validateParallelMapConfig(node, issues);

  if (!configResult.success) {
    return;
  }

  const outboundEdges = edgesBySource.get(node.id) ?? [];
  if (outboundEdges.length !== 1) {
    issues.push(
      `Parallel map node ${node.id} must have a single outbound edge`
    );
    return;
  }

  const targetId = outboundEdges[0]?.target;
  if (!targetId) {
    issues.push(`Parallel map node ${node.id} is missing target node`);
    return;
  }

  const targetNode = nodesById.get(targetId);
  if (!targetNode) {
    issues.push(
      `Parallel map node ${node.id} targets unknown node ${targetId}`
    );
    return;
  }

  if (!isParallelMapTargetType(targetNode.type)) {
    issues.push(
      `Parallel map node ${node.id} targets unsupported node type ${targetNode.type}`
    );
  }

  const targetInbound = adjacency.inbound.get(targetId)?.size ?? 0;
  if (targetInbound !== 1) {
    issues.push(`Parallel map target ${targetId} must have 1 inbound`);
  }

  const targetOutbound = adjacency.outbound.get(targetId)?.size ?? 0;
  if (targetOutbound !== 1) {
    issues.push(`Parallel map target ${targetId} must have 1 outbound`);
  }
}
