import type { ApprovalNodeConfig } from "@openplane/types/canvas";
import { ApprovalNodeConfigSchema } from "@openplane/types/canvas";

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

export function getWaitingApprovalNodeId(
  execution: ExecutionLike
): string | undefined {
  if (execution.currentNodeId) {
    return execution.currentNodeId;
  }
  for (let i = execution.steps.length - 1; i >= 0; i -= 1) {
    const step = execution.steps[i];
    if (step?.status === "WAITING_APPROVAL") {
      return step.nodeId;
    }
  }
  return;
}

export function resolveApprovalNodeConfig(
  node: CanvasNodeLike
): ApprovalNodeConfig | undefined {
  if (node.type !== "approval") {
    return;
  }
  const data = node.data;
  const raw =
    data && typeof data === "object" && "config" in data
      ? (data as { config: unknown }).config
      : data;
  const parsed = ApprovalNodeConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return;
  }
  return parsed.data;
}
