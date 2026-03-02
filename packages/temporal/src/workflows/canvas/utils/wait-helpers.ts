import type {
  CanvasApprovalSignalPayload,
  CanvasInputSignalPayload,
} from "@openplane/types/temporal";
import { condition } from "@temporalio/workflow";
import { conditionWithTimeout } from "../../temporal-utils";

interface WaitForApprovalParams {
  approvalId: string;
  timeoutMs?: number;
}

interface WaitForApprovalResult {
  response?: CanvasApprovalSignalPayload;
  timedOut: boolean;
  cancelled: boolean;
}

export async function waitForApprovalResponse(
  params: WaitForApprovalParams,
  approvalResponses: Map<string, CanvasApprovalSignalPayload>,
  cancelled: boolean
): Promise<WaitForApprovalResult> {
  const hasResponse = () => approvalResponses.has(params.approvalId);

  if (params.timeoutMs && params.timeoutMs > 0) {
    const signaled = await conditionWithTimeout(
      () => cancelled || hasResponse(),
      params.timeoutMs
    );
    if (!signaled) {
      return { timedOut: true, cancelled: false };
    }
  } else {
    await condition(() => cancelled || hasResponse());
  }

  if (cancelled) {
    return { timedOut: false, cancelled: true };
  }

  const response = approvalResponses.get(params.approvalId);
  if (response) {
    approvalResponses.delete(params.approvalId);
  }

  return { response, timedOut: false, cancelled: false };
}

interface WaitForInputParams {
  nodeId: string;
  timeoutMs?: number;
}

interface WaitForInputResult {
  response?: CanvasInputSignalPayload;
  timedOut: boolean;
  cancelled: boolean;
}

export async function waitForInputResponse(
  params: WaitForInputParams,
  inputResponses: Map<string, CanvasInputSignalPayload>,
  cancelled: boolean
): Promise<WaitForInputResult> {
  const hasResponse = () => inputResponses.has(params.nodeId);

  if (params.timeoutMs && params.timeoutMs > 0) {
    const signaled = await conditionWithTimeout(
      () => cancelled || hasResponse(),
      params.timeoutMs
    );
    if (!signaled) {
      return { timedOut: true, cancelled: false };
    }
  } else {
    await condition(() => cancelled || hasResponse());
  }

  if (cancelled) {
    return { timedOut: false, cancelled: true };
  }

  const response = inputResponses.get(params.nodeId);
  if (response) {
    inputResponses.delete(params.nodeId);
  }

  return { response, timedOut: false, cancelled: false };
}
