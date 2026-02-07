import type {
  CanvasNodeType,
  ExecutionContext,
  ExecutionPlanNode,
} from "@openplane/types/canvas";

export function createExecutionContext(
  overrides: Partial<ExecutionContext> = {}
): ExecutionContext {
  return {
    executionId: "exec-test",
    agentCanvasId: "canvas-1",
    versionNumber: 1,
    teamId: "team-1",
    triggeredById: "user-1",
    ...overrides,
  };
}

export function createPlanNode(
  type: CanvasNodeType,
  config: Record<string, unknown> = {}
): ExecutionPlanNode {
  return {
    id: `node-${type}`,
    type,
    data: { config },
    inbound: ["input"],
    outbound: ["output"],
  };
}

export function createSplitNode(
  config: Record<string, unknown>
): ExecutionPlanNode {
  return {
    id: "split",
    type: "parallel_split",
    data: { config },
    inbound: ["start"],
    outbound: ["branch-a", "branch-b"],
  };
}

export function createJoinNode(
  config: Record<string, unknown>
): ExecutionPlanNode {
  return {
    id: "join",
    type: "parallel_join",
    data: { config },
    inbound: ["branch-a", "branch-b"],
    outbound: ["out"],
  };
}

export function createLoopNodePlan(
  config: Record<string, unknown>
): ExecutionPlanNode {
  return {
    id: "loop",
    type: "loop",
    data: { config },
    inbound: ["start"],
    outbound: ["body", "done"],
  };
}
