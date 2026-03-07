import type { InputNodeConfig } from "@openbeam/types/canvas";
import { InputNodeConfigSchema } from "@openbeam/types/canvas";

type ExecutionStepLike = {
  status: string;
  nodeId: string;
};

type ExecutionLike = {
  currentNodeId?: string | null;
  steps: ExecutionStepLike[];
};

type CanvasNodeLike = {
  type?: string | null;
  data?: unknown;
};

export function getWaitingInputNodeId(
  execution: ExecutionLike
): string | undefined {
  if (execution.currentNodeId) {
    return execution.currentNodeId;
  }
  for (let i = execution.steps.length - 1; i >= 0; i -= 1) {
    const step = execution.steps[i];
    if (step?.status === "WAITING_INPUT") {
      return step.nodeId;
    }
  }
  return;
}

export function resolveInputNodeConfig(
  node: CanvasNodeLike
): InputNodeConfig | undefined {
  if (node.type !== "input") {
    return;
  }
  const data = node.data;
  const raw =
    data && typeof data === "object" && "config" in data
      ? (data as { config: unknown }).config
      : data;
  const parsed = InputNodeConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return;
  }
  return parsed.data;
}
