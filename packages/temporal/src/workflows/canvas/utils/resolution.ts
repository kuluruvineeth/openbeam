import {
  type ExecutionPlan,
  type ExecutionPlanNode,
  ParallelJoinNodeConfigSchema,
  ParallelSplitNodeConfigSchema,
} from "@openbeam/types/canvas";

import {
  type EdgeResolutionResult,
  extractBranchId,
  resolveNextEdge,
} from "./edges";
import { buildEdgeIndex, getExecutableEdges } from "./graph";
import { bfsTraverse } from "./graph-traversal";
import {
  collectReachableNodes,
  findClosestJoinIds,
  getOutboundEdges,
} from "./traversal";
import { resolveNodeConfig } from "./type-guards";

export type ParallelSplitPlan = {
  splitNodeId: string;
  joinNodeId: string;
  branches: Array<{
    branchId: string;
    startNodeId: string;
    joinInputId: string;
  }>;
};

export type ParallelMapPlan = {
  mapNodeId: string;
  targetNodeId: string;
  nextNodeId: string | null;
};

export type NextEdgeResult = EdgeResolutionResult;

export { extractBranchId, resolveNextEdge };

export function resolveParallelSplitPlan(params: {
  splitNode: ExecutionPlanNode;
  nodesById: Map<string, ExecutionPlanNode>;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  edgesByTarget: Map<string, ExecutionPlan["edges"]>;
}): ParallelSplitPlan {
  const { splitNode, nodesById, edgesBySource, edgesByTarget } = params;
  const splitConfigResult = ParallelSplitNodeConfigSchema.safeParse(
    resolveNodeConfig(splitNode.data)
  );

  if (!splitConfigResult.success) {
    throw new Error(`Parallel split node ${splitNode.id} has invalid config`);
  }

  const branchIds = splitConfigResult.data.branches.map((branch) => branch.id);
  const outboundEdges = getOutboundEdges(splitNode.id, edgesBySource);
  const edgeByHandle = new Map<string, ExecutionPlan["edges"][number]>();

  if (outboundEdges.length !== branchIds.length) {
    throw new Error(`Parallel split node ${splitNode.id} has missing branches`);
  }

  for (const edge of outboundEdges) {
    const handle = edge.sourceHandle ?? undefined;
    if (!handle) {
      throw new Error(`Parallel split node ${splitNode.id} has missing handle`);
    }
    if (edgeByHandle.has(handle)) {
      throw new Error(
        `Parallel split node ${splitNode.id} has duplicate handle`
      );
    }
    edgeByHandle.set(handle, edge);
  }

  for (const branchId of branchIds) {
    if (!edgeByHandle.has(branchId)) {
      throw new Error(
        `Parallel split node ${splitNode.id} missing branch ${branchId}`
      );
    }
  }

  const branchStarts = branchIds.map((branchId) => {
    const startEdge = edgeByHandle.get(branchId);
    if (!startEdge) {
      throw new Error(
        `Parallel split node ${splitNode.id} missing branch ${branchId}`
      );
    }
    return {
      branchId,
      startNodeId: startEdge.target,
    };
  });

  const joinNodeId = resolveJoinNodeId(
    splitNode.id,
    branchStarts,
    nodesById,
    edgesBySource
  );

  const joinNode = nodesById.get(joinNodeId);
  if (!joinNode || joinNode.type !== "parallel_join") {
    throw new Error(`Parallel split node ${splitNode.id} has invalid join`);
  }

  const joinConfigResult = ParallelJoinNodeConfigSchema.safeParse(
    resolveNodeConfig(joinNode.data)
  );

  if (!joinConfigResult.success) {
    throw new Error(`Parallel join node ${joinNode.id} has invalid config`);
  }

  const branchToJoinInput = resolveBranchToJoinInputMap({
    branchStarts,
    joinNode,
    joinConfig: joinConfigResult.data,
    edgesBySource,
    edgesByTarget,
  });

  return {
    splitNodeId: splitNode.id,
    joinNodeId,
    branches: branchStarts.map((branch) => {
      const joinInputId = branchToJoinInput.get(branch.branchId);
      if (!joinInputId) {
        throw new Error(`Parallel join node ${joinNode.id} missing input`);
      }
      return {
        branchId: branch.branchId,
        startNodeId: branch.startNodeId,
        joinInputId,
      };
    }),
  };
}

function resolveJoinNodeId(
  splitNodeId: string,
  branchStarts: Array<{ branchId: string; startNodeId: string }>,
  nodesById: Map<string, ExecutionPlanNode>,
  edgesBySource: Map<string, ExecutionPlan["edges"]>
): string {
  const joinSets = branchStarts.map((branch) =>
    findClosestJoinIds(branch.startNodeId, nodesById, edgesBySource)
  );

  if (joinSets.some((set) => set.size === 0)) {
    throw new Error(`Parallel split node ${splitNodeId} missing join node`);
  }

  let intersection = new Set(joinSets[0]);
  for (let i = 1; i < joinSets.length; i += 1) {
    const next = joinSets[i];
    if (!next) {
      throw new Error(`Parallel split node ${splitNodeId} has invalid join`);
    }
    const newIntersection = new Set<string>();
    for (const id of intersection) {
      if (next.has(id)) {
        newIntersection.add(id);
      }
    }
    intersection = newIntersection;
  }

  if (intersection.size !== 1) {
    throw new Error(`Parallel split node ${splitNodeId} has ambiguous join`);
  }

  const [joinNodeId] = Array.from(intersection);
  if (!joinNodeId) {
    throw new Error(`Parallel split node ${splitNodeId} has invalid join`);
  }

  return joinNodeId;
}

function resolveBranchToJoinInputMap(params: {
  branchStarts: Array<{ branchId: string; startNodeId: string }>;
  joinNode: ExecutionPlanNode;
  joinConfig: { inputs: Array<{ id: string }> };
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  edgesByTarget: Map<string, ExecutionPlan["edges"]>;
}): Map<string, string> {
  const { branchStarts, joinNode, joinConfig, edgesBySource, edgesByTarget } =
    params;
  const joinInputIds = joinConfig.inputs.map((input) => input.id);
  const joinInputIdSet = new Set(joinInputIds);
  const inboundEdges = edgesByTarget.get(joinNode.id) ?? [];

  if (inboundEdges.length !== joinInputIds.length) {
    throw new Error(`Parallel join node ${joinNode.id} missing inputs`);
  }

  const joinInputs = new Set<string>();
  for (const edge of inboundEdges) {
    const handle = edge.targetHandle ?? undefined;
    if (!handle) {
      throw new Error(`Parallel join node ${joinNode.id} has missing handle`);
    }
    if (joinInputs.has(handle)) {
      throw new Error(`Parallel join node ${joinNode.id} has duplicate handle`);
    }
    if (!joinInputIdSet.has(handle)) {
      throw new Error(`Parallel join node ${joinNode.id} has unknown handle`);
    }
    joinInputs.add(handle);
  }

  const reachableByBranch = new Map<string, Set<string>>();
  for (const branch of branchStarts) {
    reachableByBranch.set(
      branch.branchId,
      collectReachableNodes(branch.startNodeId, edgesBySource)
    );
  }

  const branchToJoinInput = new Map<string, string>();
  const usedInputs = new Set<string>();

  for (const edge of inboundEdges) {
    const joinInput = edge.targetHandle ?? "";
    const matchingBranches = branchStarts.filter((branch) =>
      reachableByBranch.get(branch.branchId)?.has(edge.source)
    );

    if (matchingBranches.length !== 1) {
      throw new Error(`Parallel join node ${joinNode.id} has invalid branch`);
    }

    const branchEntry = matchingBranches[0];
    if (!branchEntry) {
      throw new Error(`Parallel join node ${joinNode.id} has invalid branch`);
    }

    const branchId = branchEntry.branchId;
    const existing = branchToJoinInput.get(branchId);

    if (existing && existing !== joinInput) {
      throw new Error(
        `Parallel join node ${joinNode.id} has conflicting branch inputs`
      );
    }

    if (!existing) {
      if (usedInputs.has(joinInput)) {
        throw new Error(
          `Parallel join node ${joinNode.id} has duplicate input ${joinInput}`
        );
      }
      branchToJoinInput.set(branchId, joinInput);
      usedInputs.add(joinInput);
    }
  }

  if (branchToJoinInput.size !== branchStarts.length) {
    throw new Error(`Parallel join node ${joinNode.id} missing branch input`);
  }

  return branchToJoinInput;
}

export function resolveParallelMapPlan(params: {
  mapNode: ExecutionPlanNode;
  nodesById: Map<string, ExecutionPlanNode>;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
}): ParallelMapPlan {
  const { mapNode, nodesById, edgesBySource } = params;
  const outboundEdges = getOutboundEdges(mapNode.id, edgesBySource);

  if (outboundEdges.length !== 1) {
    throw new Error(
      `Parallel map node ${mapNode.id} must have 1 outbound edge`
    );
  }

  const targetId = outboundEdges[0]?.target;
  if (!targetId) {
    throw new Error(`Parallel map node ${mapNode.id} missing target node`);
  }

  const targetNode = nodesById.get(targetId);
  if (!targetNode) {
    throw new Error(`Parallel map node ${mapNode.id} target not found`);
  }

  const { nextNodeId } = resolveNextEdge({
    node: targetNode,
    edgesBySource,
    branchId: null,
  });

  return {
    mapNodeId: mapNode.id,
    targetNodeId: targetNode.id,
    nextNodeId,
  };
}

export function resolveExecutionOrder(plan: ExecutionPlan): string[] {
  const executableEdges = getExecutableEdges(plan);
  const { edgesBySource } = buildEdgeIndex(executableEdges);

  const startNode = plan.nodes.find(
    (n) =>
      n.type === "start" ||
      n.type === "trigger_manual" ||
      n.type === "trigger_schedule" ||
      n.type === "trigger_webhook" ||
      n.type === "trigger_event"
  );

  if (!startNode) {
    return [];
  }

  return bfsTraverse(
    startNode.id,
    plan.nodes,
    (node) => {
      const edges = edgesBySource.get(node.id) ?? [];
      return edges.map((edge) => edge.target);
    },
    (node) => node.id
  );
}

export function resolvePlanDependencies(
  plan: ExecutionPlan
): Map<string, Set<string>> {
  const edges = getExecutableEdges(plan);
  const dependencies = new Map<string, Set<string>>();

  for (const node of plan.nodes) {
    if (node.type === "annotation") {
      continue;
    }
    dependencies.set(node.id, new Set());
  }

  for (const edge of edges) {
    const deps = dependencies.get(edge.target);
    if (deps) {
      deps.add(edge.source);
    }
  }

  return dependencies;
}

export function resolveNodeReady(
  nodeId: string,
  completedNodes: Set<string>,
  dependencies: Map<string, Set<string>>
): boolean {
  const deps = dependencies.get(nodeId);
  if (!deps) {
    return false;
  }

  for (const dep of deps) {
    if (!completedNodes.has(dep)) {
      return false;
    }
  }

  return true;
}

export function resolveNextNodes(
  completedNodes: Set<string>,
  pendingNodes: Set<string>,
  dependencies: Map<string, Set<string>>
): string[] {
  const ready: string[] = [];

  for (const nodeId of pendingNodes) {
    if (resolveNodeReady(nodeId, completedNodes, dependencies)) {
      ready.push(nodeId);
    }
  }

  return ready;
}
