import type { ExecutionPlan } from "@openbeam/types/canvas";
import { ApplicationFailure } from "@temporalio/workflow";
import {
  buildAdjacency,
  buildEdgeIndex,
  buildNodeIndex,
  containsInvalidCycle,
  getExecutableEdges,
  getExecutableNodes,
} from "../utils/graph";
import {
  validateApprovalNodeEdges,
  validateConditionNodeEdges,
  validateInputNodeEdges,
  validateLoopNodeEdges,
  validateParallelJoinNodeEdges,
  validateParallelSplitNodeEdges,
} from "./edge-validator";
import {
  validateParallelMapNode,
  validateRetryNode,
  validateSubWorkflowNode,
  validateTryCatchNode,
} from "./node-validator";
import type {
  EnforceExecutionPlanOptions,
  PlanValidationContext,
} from "./types";
import { ENTRY_NODE_TYPES, SUPPORTED_NODE_TYPES } from "./types";

export function validateGraphStructure(
  plan: ExecutionPlan,
  options: EnforceExecutionPlanOptions = {}
): void {
  const nodes = getExecutableNodes(plan);
  const edges = getExecutableEdges(plan);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const nodesById = buildNodeIndex(nodes);
  const nodeTypes = new Map(nodes.map((node) => [node.id, node.type]));
  const adjacency = buildAdjacency(nodeIds, edges);
  const startNodes = nodes.filter((node) => ENTRY_NODE_TYPES.has(node.type));
  const endNodes = nodes.filter((node) => node.type === "end");
  const { edgesBySource, edgesByTarget } = buildEdgeIndex(edges);
  const issues: string[] = [];

  if (startNodes.length !== 1) {
    issues.push("Execution requires exactly one start or trigger node");
  }

  if (endNodes.length === 0) {
    issues.push("Execution requires at least one end node");
  }

  if (containsInvalidCycle(nodeIds, adjacency.outbound, nodeTypes)) {
    issues.push("Execution graph contains an unsupported cycle");
  }

  for (const node of nodes) {
    const inbound = adjacency.inbound.get(node.id)?.size ?? 0;
    const outbound = adjacency.outbound.get(node.id)?.size ?? 0;

    if (ENTRY_NODE_TYPES.has(node.type)) {
      if (inbound !== 0 || outbound !== 1) {
        issues.push("Start or trigger node must have 0 inbound and 1 outbound");
      }
      continue;
    }

    if (node.type === "end") {
      if (outbound !== 0 || inbound === 0) {
        issues.push("End node must have at least 1 inbound and 0 outbound");
      }
      continue;
    }

    if (node.type === "condition") {
      validateConditionNodeEdges({
        node,
        inbound,
        outbound,
        edgesBySource,
        issues,
      });
      continue;
    }

    if (node.type === "approval") {
      validateApprovalNodeEdges({
        node,
        inbound,
        outbound,
        edgesBySource,
        issues,
      });
      continue;
    }

    if (node.type === "input") {
      validateInputNodeEdges({
        node,
        inbound,
        outbound,
        edgesBySource,
        issues,
      });
      continue;
    }

    if (node.type === "sub_workflow") {
      validateSubWorkflowNode({
        node,
        inbound,
        outbound,
        issues,
      });
      continue;
    }

    if (node.type === "loop") {
      validateLoopNodeEdges({
        node,
        inbound,
        outbound,
        edgesBySource,
        issues,
      });
      continue;
    }

    if (node.type === "parallel_split") {
      validateParallelSplitNodeEdges({
        node,
        inbound,
        outbound,
        edgesBySource,
        issues,
      });
      continue;
    }

    if (node.type === "parallel_join") {
      validateParallelJoinNodeEdges({
        node,
        inbound,
        outbound,
        edgesByTarget,
        issues,
      });
      continue;
    }

    if (node.type === "retry") {
      validateRetryNode({
        node,
        inbound,
        outbound,
        edgesBySource,
        nodesById,
        adjacency,
        issues,
      });
      continue;
    }

    if (node.type === "try_catch") {
      validateTryCatchNode({
        node,
        inbound,
        outbound,
        edgesBySource,
        nodesById,
        adjacency,
        issues,
      });
      continue;
    }

    if (node.type === "parallel_map") {
      validateParallelMapNode({
        node,
        inbound,
        outbound,
        edgesBySource,
        nodesById,
        adjacency,
        issues,
      });
      continue;
    }

    if (inbound !== 1 || outbound !== 1) {
      issues.push(`Node ${node.id} must have 1 inbound and 1 outbound`);
    }
  }

  const validationContext: PlanValidationContext = {
    nodesById,
    edgesBySource,
    edgesByTarget,
  };

  if (options.validateParallelSplitPlan) {
    for (const node of nodes) {
      if (node.type !== "parallel_split") {
        continue;
      }
      try {
        options.validateParallelSplitPlan(node, validationContext);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        issues.push(message);
      }
    }
  }

  if (options.validateParallelMapPlan) {
    for (const node of nodes) {
      if (node.type !== "parallel_map") {
        continue;
      }
      try {
        options.validateParallelMapPlan(node, validationContext);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        issues.push(message);
      }
    }
  }

  if (issues.length > 0) {
    throw ApplicationFailure.nonRetryable(
      issues.join("; "),
      "CanvasExecutionPlanError"
    );
  }
}

export function validateSupportedNodes(plan: ExecutionPlan): void {
  const unsupported = getExecutableNodes(plan)
    .filter((node) => !SUPPORTED_NODE_TYPES.has(node.type))
    .map((node) => node.type);

  if (unsupported.length > 0) {
    throw ApplicationFailure.nonRetryable(
      `Unsupported node types: ${[...new Set(unsupported)].join(", ")}`,
      "UnsupportedNodeType"
    );
  }
}

export function enforceExecutionPlan(
  plan: ExecutionPlan,
  options: EnforceExecutionPlanOptions = {}
): void {
  validateGraphStructure(plan, options);
}

export function ensureSupportedNodes(plan: ExecutionPlan): void {
  validateSupportedNodes(plan);
}
