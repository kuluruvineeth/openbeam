import type { ExecutionPlan, ExecutionPlanNode } from "@openbeam/types/canvas";

import { createExecutionPlanError } from "./errors";
import { isRecord } from "./type-guards";

export type EdgeIndex = Map<string, ExecutionPlan["edges"]>;

export type EdgeResolutionResult = {
  nextNodeId: string | null;
  edge?: ExecutionPlan["edges"][number];
};

export function extractBranchId(output: unknown): string | null {
  if (typeof output === "string") {
    return output;
  }

  if (isRecord(output)) {
    const branchId = output.branchId;
    if (typeof branchId === "string") {
      return branchId;
    }
  }

  return null;
}

export function filterEdgesBySourceHandle(
  edges: ExecutionPlan["edges"],
  handle: string
): ExecutionPlan["edges"] {
  return edges.filter((edge) => edge.sourceHandle === handle);
}

export function filterEdgesByTargetHandle(
  edges: ExecutionPlan["edges"],
  handle: string
): ExecutionPlan["edges"] {
  return edges.filter((edge) => edge.targetHandle === handle);
}

export function findEdgeBySourceHandle(
  edges: ExecutionPlan["edges"],
  handle: string
): ExecutionPlan["edges"][number] | undefined {
  return edges.find((edge) => edge.sourceHandle === handle);
}

export function findEdgeByTargetHandle(
  edges: ExecutionPlan["edges"],
  handle: string
): ExecutionPlan["edges"][number] | undefined {
  return edges.find((edge) => edge.targetHandle === handle);
}

export function getEdgeTarget(
  edge: ExecutionPlan["edges"][number] | undefined
): string | null {
  return edge?.target ?? null;
}

export function getEdgeSource(
  edge: ExecutionPlan["edges"][number] | undefined
): string | null {
  return edge?.source ?? null;
}

export function buildEdgeByHandleMap(
  edges: ExecutionPlan["edges"],
  useSourceHandle: boolean
): Map<string, ExecutionPlan["edges"][number]> {
  const map = new Map<string, ExecutionPlan["edges"][number]>();

  for (const edge of edges) {
    const handle = useSourceHandle
      ? (edge.sourceHandle ?? undefined)
      : (edge.targetHandle ?? undefined);
    if (handle) {
      map.set(handle, edge);
    }
  }

  return map;
}

function resolveConditionEdge(
  node: ExecutionPlanNode,
  outboundEdges: ExecutionPlan["edges"],
  branchId: string | null
): EdgeResolutionResult {
  if (branchId) {
    const matches = filterEdgesBySourceHandle(outboundEdges, branchId);

    if (matches.length === 1) {
      return { nextNodeId: getEdgeTarget(matches[0]), edge: matches[0] };
    }

    if (matches.length > 1) {
      throw createExecutionPlanError(
        `Condition node ${node.id} has duplicate handle ${branchId}`
      );
    }
  }

  const defaultEdge = findEdgeBySourceHandle(outboundEdges, "default");
  if (defaultEdge) {
    return { nextNodeId: defaultEdge.target, edge: defaultEdge };
  }

  if (outboundEdges.length === 1) {
    return {
      nextNodeId: getEdgeTarget(outboundEdges[0]),
      edge: outboundEdges[0],
    };
  }

  throw createExecutionPlanError(
    `Condition node ${node.id} did not match any branch`
  );
}

function resolveApprovalEdge(
  node: ExecutionPlanNode,
  outboundEdges: ExecutionPlan["edges"],
  branchId: string | null
): EdgeResolutionResult {
  if (!branchId) {
    throw createExecutionPlanError(
      `Approval node ${node.id} did not return a branch`
    );
  }

  const matches = filterEdgesBySourceHandle(outboundEdges, branchId);

  if (matches.length === 1) {
    return { nextNodeId: getEdgeTarget(matches[0]), edge: matches[0] };
  }

  if (matches.length > 1) {
    throw createExecutionPlanError(
      `Approval node ${node.id} has duplicate handle ${branchId}`
    );
  }

  throw createExecutionPlanError(
    `Approval node ${node.id} did not match branch ${branchId}`
  );
}

function resolveInputEdge(
  node: ExecutionPlanNode,
  outboundEdges: ExecutionPlan["edges"],
  branchId: string | null
): EdgeResolutionResult {
  if (branchId) {
    const matches = filterEdgesBySourceHandle(outboundEdges, branchId);

    if (matches.length === 1) {
      return { nextNodeId: getEdgeTarget(matches[0]), edge: matches[0] };
    }

    if (matches.length > 1) {
      throw createExecutionPlanError(
        `Input node ${node.id} has duplicate handle ${branchId}`
      );
    }

    throw createExecutionPlanError(
      `Input node ${node.id} did not match branch ${branchId}`
    );
  }

  if (outboundEdges.length === 1) {
    return {
      nextNodeId: getEdgeTarget(outboundEdges[0]),
      edge: outboundEdges[0],
    };
  }

  throw createExecutionPlanError(
    `Input node ${node.id} has invalid outbound count`
  );
}

function resolveLoopEdge(
  node: ExecutionPlanNode,
  outboundEdges: ExecutionPlan["edges"],
  branchId: string | null
): EdgeResolutionResult {
  if (!branchId) {
    throw createExecutionPlanError(
      `Loop node ${node.id} did not return a branch`
    );
  }

  const matches = filterEdgesBySourceHandle(outboundEdges, branchId);

  if (matches.length === 1) {
    return { nextNodeId: getEdgeTarget(matches[0]), edge: matches[0] };
  }

  if (matches.length > 1) {
    throw createExecutionPlanError(
      `Loop node ${node.id} has duplicate handle ${branchId}`
    );
  }

  throw createExecutionPlanError(
    `Loop node ${node.id} did not match branch ${branchId}`
  );
}

export function resolveNextEdge(params: {
  node: ExecutionPlanNode;
  edgesBySource: EdgeIndex;
  branchId: string | null;
}): EdgeResolutionResult {
  const { node, edgesBySource, branchId } = params;
  const outboundEdges = edgesBySource.get(node.id) ?? [];

  if (node.type === "end") {
    return { nextNodeId: null };
  }

  if (outboundEdges.length === 0) {
    throw createExecutionPlanError(
      `${node.type} node ${node.id} has no outbound edges`
    );
  }

  if (node.type === "condition") {
    return resolveConditionEdge(node, outboundEdges, branchId);
  }

  if (node.type === "approval") {
    return resolveApprovalEdge(node, outboundEdges, branchId);
  }

  if (node.type === "input") {
    return resolveInputEdge(node, outboundEdges, branchId);
  }

  if (node.type === "loop") {
    return resolveLoopEdge(node, outboundEdges, branchId);
  }

  if (outboundEdges.length !== 1) {
    throw createExecutionPlanError(
      `Node ${node.id} has invalid outbound count`
    );
  }

  return {
    nextNodeId: getEdgeTarget(outboundEdges[0]),
    edge: outboundEdges[0],
  };
}

export function resolveEdgesForHandle(
  nodeId: string,
  handle: string,
  edgesBySource: EdgeIndex
): ExecutionPlan["edges"] {
  const outboundEdges = edgesBySource.get(nodeId) ?? [];
  return filterEdgesBySourceHandle(outboundEdges, handle);
}

export function resolveTryCatchEdges(
  nodeId: string,
  edgesBySource: EdgeIndex
): {
  tryEdge: ExecutionPlan["edges"][number] | undefined;
  catchEdge: ExecutionPlan["edges"][number] | undefined;
} {
  const outboundEdges = edgesBySource.get(nodeId) ?? [];
  return {
    tryEdge: findEdgeBySourceHandle(outboundEdges, "try"),
    catchEdge: findEdgeBySourceHandle(outboundEdges, "catch"),
  };
}

export function validateTryCatchEdges(
  nodeId: string,
  tryEdge: ExecutionPlan["edges"][number] | undefined,
  catchEdge: ExecutionPlan["edges"][number] | undefined
): void {
  if (!(tryEdge && catchEdge)) {
    throw createExecutionPlanError(
      `Try/catch node ${nodeId} is missing try or catch branch`
    );
  }
}

export function validateUniqueEdgeHandles(
  edges: ExecutionPlan["edges"],
  nodeId: string,
  nodeType: string,
  useSourceHandle: boolean
): Map<string, ExecutionPlan["edges"][number]> {
  const edgeByHandle = new Map<string, ExecutionPlan["edges"][number]>();

  for (const edge of edges) {
    const handle = useSourceHandle
      ? (edge.sourceHandle ?? undefined)
      : (edge.targetHandle ?? undefined);

    if (!handle) {
      throw createExecutionPlanError(
        `${nodeType} node ${nodeId} has missing handle`
      );
    }

    if (edgeByHandle.has(handle)) {
      throw createExecutionPlanError(
        `${nodeType} node ${nodeId} has duplicate handle`
      );
    }

    edgeByHandle.set(handle, edge);
  }

  return edgeByHandle;
}
