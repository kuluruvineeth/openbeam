import type {
  CanvasNodeType,
  CanvasState,
  ExecutionPlanNode,
} from "@openplane/types/canvas";

export function createBaseNode(
  type: CanvasNodeType,
  overrides: Partial<ExecutionPlanNode> = {}
): ExecutionPlanNode {
  return {
    id: `node-${type}-${Date.now()}`,
    type,
    data: {},
    inbound: [],
    outbound: [],
    ...overrides,
  };
}

export function createLinearCanvas(nodeTypes: CanvasNodeType[]): CanvasState {
  const nodes = nodeTypes.map((type, i) => ({
    id: `node-${i}`,
    type,
    position: { x: i * 200, y: 100 },
    data: {},
  }));

  return {
    nodes,
    edges: nodes.slice(0, -1).map((_, i) => ({
      id: `edge-${i}`,
      source: `node-${i}`,
      target: `node-${i + 1}`,
    })),
  };
}

export function createConditionNode(
  branches: Array<{ id: string; condition: string }>
): ExecutionPlanNode {
  return createBaseNode("condition", {
    data: {
      config: {
        branches,
        defaultBranch: branches[0]?.id,
      },
    },
    outbound: branches.map((b) => b.id),
  });
}

export function createLoopNode(config: {
  maxIterations: number;
  condition?: string;
}): ExecutionPlanNode {
  return createBaseNode("loop", {
    data: { config },
  });
}

export function createParallelSplitNode(
  branchCount: number
): ExecutionPlanNode {
  const branches = Array.from({ length: branchCount }, (_, i) => ({
    id: `branch-${i}`,
    label: `Branch ${i}`,
  }));

  return createBaseNode("parallel_split", {
    data: {
      config: {
        branches,
        dataDistribution: "broadcast",
        executionMode: "parallel",
        maxConcurrency: branchCount,
        waitForAll: true,
        errorHandling: "failFast",
      },
    },
    outbound: branches.map((b) => b.id),
  });
}
