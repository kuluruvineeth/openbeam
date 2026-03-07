import type {
  ConditionNodeConfig,
  ExecutionPlan,
  ExecutionPlanNode,
} from "@openbeam/types/canvas";

export function validateNodeExists(
  nodesById: Map<string, ExecutionPlanNode>,
  nodeId: string,
  context: string
): ExecutionPlanNode {
  const node = nodesById.get(nodeId);
  if (!node) {
    throw new Error(`${context}: Node "${nodeId}" not found`);
  }
  return node;
}

export function validateEdgeConnection(
  edge: ExecutionPlan["edges"][number],
  _sourceNode: ExecutionPlanNode,
  _targetNode: ExecutionPlanNode,
  context: string
): void {
  if (!(edge.source && edge.target)) {
    throw new Error(`${context}: Edge missing source or target`);
  }
}

export function validateUniqueHandles(
  handles: Set<string>,
  handle: string | null | undefined,
  nodeId: string,
  context: string
): void {
  if (!handle) {
    throw new Error(`${context} ${nodeId} has edge without handle`);
  }
  if (handles.has(handle)) {
    throw new Error(`${context} ${nodeId} has duplicate handle ${handle}`);
  }
  handles.add(handle);
}

export function validateHandleInSet(
  handle: string,
  allowedHandles: Set<string>,
  nodeId: string,
  context: string
): void {
  if (!allowedHandles.has(handle)) {
    throw new Error(`${context} ${nodeId} has unknown handle ${handle}`);
  }
}

export function conditionHandles(config: ConditionNodeConfig): Set<string> {
  if (config.branches.length === 0) {
    return new Set(["true", "false"]);
  }

  const handles = new Set(config.branches.map((branch) => branch.id));
  if (config.defaultBranchLabel?.trim()) {
    handles.add("default");
  }

  return handles;
}

export function collectOutboundHandles(
  outboundEdges: ExecutionPlan["edges"],
  nodeId: string,
  issues: string[],
  context: string
): Set<string> {
  const handles = new Set<string>();

  for (const edge of outboundEdges) {
    const handle = edge.sourceHandle ?? undefined;
    if (!handle) {
      issues.push(`${context} ${nodeId} has edge without handle`);
      continue;
    }
    if (handles.has(handle)) {
      issues.push(`${context} ${nodeId} has duplicate handle ${handle}`);
      continue;
    }
    handles.add(handle);
  }

  return handles;
}

export function collectInboundHandles(
  inboundEdges: ExecutionPlan["edges"],
  nodeId: string,
  issues: string[],
  context: string
): Set<string> {
  const handles = new Set<string>();

  for (const edge of inboundEdges) {
    const handle = edge.targetHandle ?? undefined;
    if (!handle) {
      issues.push(`${context} ${nodeId} has edge without handle`);
      continue;
    }
    if (handles.has(handle)) {
      issues.push(`${context} ${nodeId} has duplicate handle ${handle}`);
      continue;
    }
    handles.add(handle);
  }

  return handles;
}

// biome-ignore lint/nursery/useMaxParams: validation function requires all parameters
export function validateRequiredHandles(
  actualHandles: Set<string>,
  requiredHandles: string[],
  nodeId: string,
  context: string,
  issues: string[]
): void {
  for (const required of requiredHandles) {
    if (!actualHandles.has(required)) {
      issues.push(`${context} ${nodeId} missing required handle ${required}`);
    }
  }
}
