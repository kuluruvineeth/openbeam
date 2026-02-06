import type { ExecutionPlan, ExecutionPlanNode } from "@openplane/types/canvas";
import {
  validateApprovalConfig,
  validateConditionConfig,
  validateInputConfig,
  validateLoopConfig,
  validateParallelJoinConfig,
  validateParallelSplitConfig,
} from "./config-validator";
import { conditionHandles } from "./utils";

export function validateConditionNodeEdges(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  issues: string[];
}): void {
  const { node, inbound, outbound, edgesBySource, issues } = params;

  if (inbound !== 1 || outbound === 0) {
    issues.push("Condition node must have 1 inbound and at least 1 outbound");
    return;
  }

  const outboundEdges = edgesBySource.get(node.id) ?? [];
  const handles = new Set<string>();
  const configResult = validateConditionConfig(node, issues);

  if (!configResult.success) {
    return;
  }

  const allowedHandles = conditionHandles(configResult.data);

  for (const edge of outboundEdges) {
    const handle = edge.sourceHandle ?? undefined;
    if (!handle) {
      issues.push(`Condition node ${node.id} has edge without handle`);
      continue;
    }
    if (handles.has(handle)) {
      issues.push(`Condition node ${node.id} has duplicate handle ${handle}`);
      continue;
    }
    handles.add(handle);
    if (!allowedHandles.has(handle)) {
      issues.push(`Condition node ${node.id} has unknown handle ${handle}`);
    }
  }
}

export function validateApprovalNodeEdges(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  issues: string[];
}): void {
  const { node, inbound, outbound, edgesBySource, issues } = params;

  if (inbound !== 1 || outbound === 0) {
    issues.push("Approval node must have 1 inbound and 2 outbound");
    return;
  }

  const outboundEdges = edgesBySource.get(node.id) ?? [];
  const handles = new Set<string>();

  validateApprovalConfig(node, issues);

  if (outboundEdges.length < 2) {
    issues.push(
      `Approval node ${node.id} requires approved and rejected edges`
    );
  }

  const allowedHandles = new Set(["approved", "rejected"]);

  for (const edge of outboundEdges) {
    const handle = edge.sourceHandle ?? undefined;
    if (!handle) {
      issues.push(`Approval node ${node.id} has edge without handle`);
      continue;
    }
    if (handles.has(handle)) {
      issues.push(`Approval node ${node.id} has duplicate handle ${handle}`);
      continue;
    }
    handles.add(handle);
    if (!allowedHandles.has(handle)) {
      issues.push(`Approval node ${node.id} has unknown handle ${handle}`);
    }
  }

  if (!(handles.has("approved") && handles.has("rejected"))) {
    issues.push(
      `Approval node ${node.id} must define approved and rejected handles`
    );
  }
}

export function validateInputNodeEdges(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  issues: string[];
}): void {
  const { node, inbound, outbound, edgesBySource, issues } = params;

  if (inbound !== 1 || outbound === 0) {
    issues.push("Input node must have 1 inbound and at least 1 outbound");
    return;
  }

  const outboundEdges = edgesBySource.get(node.id) ?? [];
  const handles = new Set<string>();
  const configResult = validateInputConfig(node, issues);

  if (!configResult.success) {
    return;
  }

  const config = configResult.data;

  if (config.allowSkip) {
    if (outboundEdges.length < 2) {
      issues.push(`Input node ${node.id} requires data and skipped edges`);
    }

    const allowedHandles = new Set(["data", "skipped"]);

    for (const edge of outboundEdges) {
      const handle = edge.sourceHandle ?? undefined;
      if (!handle) {
        issues.push(`Input node ${node.id} has edge without handle`);
        continue;
      }
      if (handles.has(handle)) {
        issues.push(`Input node ${node.id} has duplicate handle ${handle}`);
        continue;
      }
      handles.add(handle);
      if (!allowedHandles.has(handle)) {
        issues.push(`Input node ${node.id} has unknown handle ${handle}`);
      }
    }

    if (!(handles.has("data") && handles.has("skipped"))) {
      issues.push(`Input node ${node.id} must define data and skipped handles`);
    }
    return;
  }

  if (outboundEdges.length !== 1) {
    issues.push(`Input node ${node.id} must have 1 outbound edge`);
  }

  for (const edge of outboundEdges) {
    const handle = edge.sourceHandle ?? undefined;
    if (handle && handle !== "data") {
      issues.push(`Input node ${node.id} has unknown handle ${handle}`);
    }
  }
}

export function validateLoopNodeEdges(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  issues: string[];
}): void {
  const { node, inbound, outbound, edgesBySource, issues } = params;

  if (inbound === 0 || outbound === 0) {
    issues.push("Loop node must have at least 1 inbound and 1 outbound");
    return;
  }

  const outboundEdges = edgesBySource.get(node.id) ?? [];
  const handles = new Set<string>();
  const allowedHandles = new Set(["body", "done"]);

  validateLoopConfig(node, issues);

  for (const edge of outboundEdges) {
    const handle = edge.sourceHandle ?? undefined;
    if (!handle) {
      issues.push(`Loop node ${node.id} has edge without handle`);
      continue;
    }
    if (handles.has(handle)) {
      issues.push(`Loop node ${node.id} has duplicate handle ${handle}`);
      continue;
    }
    handles.add(handle);
    if (!allowedHandles.has(handle)) {
      issues.push(`Loop node ${node.id} has unknown handle ${handle}`);
    }
  }

  if (!(handles.has("body") && handles.has("done"))) {
    issues.push(`Loop node ${node.id} must have body and done branches`);
  }
}

export function validateParallelSplitNodeEdges(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  edgesBySource: Map<string, ExecutionPlan["edges"]>;
  issues: string[];
}): void {
  const { node, inbound, outbound, edgesBySource, issues } = params;

  if (inbound !== 1 || outbound < 2) {
    issues.push("Parallel split must have 1 inbound and at least 2 outbound");
    return;
  }

  const configResult = validateParallelSplitConfig(node, issues);

  if (!configResult.success) {
    return;
  }

  const branchIds = configResult.data.branches.map((branch) => branch.id);
  const outboundEdges = edgesBySource.get(node.id) ?? [];
  const handles = new Set<string>();

  if (outboundEdges.length !== branchIds.length) {
    issues.push(`Parallel split node ${node.id} has missing branch edges`);
  }

  for (const edge of outboundEdges) {
    const handle = edge.sourceHandle ?? undefined;
    if (!handle) {
      issues.push(`Parallel split node ${node.id} has edge without handle`);
      continue;
    }
    if (handles.has(handle)) {
      issues.push(
        `Parallel split node ${node.id} has duplicate handle ${handle}`
      );
      continue;
    }
    handles.add(handle);
    if (!branchIds.includes(handle)) {
      issues.push(
        `Parallel split node ${node.id} has unknown handle ${handle}`
      );
    }
  }

  for (const branchId of branchIds) {
    if (!handles.has(branchId)) {
      issues.push(
        `Parallel split node ${node.id} missing branch handle ${branchId}`
      );
    }
  }
}

export function validateParallelJoinNodeEdges(params: {
  node: ExecutionPlanNode;
  inbound: number;
  outbound: number;
  edgesByTarget: Map<string, ExecutionPlan["edges"]>;
  issues: string[];
}): void {
  const { node, inbound, outbound, edgesByTarget, issues } = params;

  if (inbound < 2 || outbound !== 1) {
    issues.push("Parallel join must have at least 2 inbound and 1 outbound");
    return;
  }

  const configResult = validateParallelJoinConfig(node, issues);

  if (!configResult.success) {
    return;
  }

  const inputIds = configResult.data.inputs.map((input) => input.id);
  const inboundEdges = edgesByTarget.get(node.id) ?? [];
  const handles = new Set<string>();

  if (inboundEdges.length !== inputIds.length) {
    issues.push(`Parallel join node ${node.id} has missing input edges`);
  }

  for (const edge of inboundEdges) {
    const handle = edge.targetHandle ?? undefined;
    if (!handle) {
      issues.push(`Parallel join node ${node.id} has edge without handle`);
      continue;
    }
    if (handles.has(handle)) {
      issues.push(
        `Parallel join node ${node.id} has duplicate handle ${handle}`
      );
      continue;
    }
    handles.add(handle);
    if (!inputIds.includes(handle)) {
      issues.push(`Parallel join node ${node.id} has unknown handle ${handle}`);
    }
  }

  for (const inputId of inputIds) {
    if (!handles.has(inputId)) {
      issues.push(`Parallel join node ${node.id} missing input ${inputId}`);
    }
  }
}
