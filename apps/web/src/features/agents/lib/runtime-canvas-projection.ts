import type {
  AgentCanvasEdge,
  AgentCanvasNode,
  NodeStatus,
  RuntimeEvent,
} from "@openbeam/types/canvas";

const DEFAULT_POSITION = { x: 0, y: 0 };

interface CanvasStoreMutations {
  addNode: (node: AgentCanvasNode) => void;
  addEdge: (edge: AgentCanvasEdge) => void;
  removeNode: (id: string) => void;
  removeEdge: (id: string) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
}

type EdgeState = "idle" | "running" | "success" | "error";

export function applyRuntimeCanvasOperation(
  store: CanvasStoreMutations,
  event: RuntimeEvent
): void {
  if (event.payload.type !== "canvas.op_applied") {
    return;
  }

  const op = event.payload.operation;

  switch (op.type) {
    case "add_node":
      store.addNode({
        id: op.id,
        type: op.nodeType,
        position: op.position ?? DEFAULT_POSITION,
        data: { label: op.label, config: op.config },
      });
      break;

    case "connect":
      store.addEdge({
        id: op.id,
        source: op.source,
        target: op.target,
        sourceHandle: op.sourceHandle,
        targetHandle: op.targetHandle,
      });
      break;

    case "remove_node":
      store.removeNode(op.nodeId);
      break;

    case "disconnect":
      store.removeEdge(op.edgeId);
      break;

    case "update_config":
      store.updateNodeData(op.nodeId, op.config);
      break;

    default:
      break;
  }
}

export function buildExecutionOverlayFromRuntime(
  nodeStatusMap: Record<string, NodeStatus> | undefined,
  edgeStateMap: Record<string, EdgeState> | undefined,
  nodes: AgentCanvasNode[]
): {
  nodeStatusMap?: Record<string, NodeStatus>;
  edgeStateMap?: Record<string, EdgeState>;
  currentNodeLabel?: string;
  progress?: { value: number; label: string };
} {
  if (!nodeStatusMap) {
    return {};
  }

  const runningNodeId = Object.entries(nodeStatusMap).find(
    ([, status]) => status === "running"
  )?.[0];

  const currentNode = runningNodeId
    ? nodes.find((n) => n.id === runningNodeId)
    : undefined;

  const totalNodes = Object.keys(nodeStatusMap).length;
  const completedNodes = Object.values(nodeStatusMap).filter(
    (s) => s === "success" || s === "error"
  ).length;

  return {
    nodeStatusMap,
    edgeStateMap,
    currentNodeLabel: (currentNode?.data as { label?: string })?.label,
    progress:
      totalNodes > 0
        ? {
            value: completedNodes / totalNodes,
            label: `${completedNodes}/${totalNodes} nodes`,
          }
        : undefined,
  };
}
