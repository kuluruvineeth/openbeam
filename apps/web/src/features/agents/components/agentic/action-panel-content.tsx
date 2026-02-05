import type { RouterOutputs } from "@openplane/api/routers/index";
import type { AgentCanvasNode } from "@openplane/types/canvas";
import { Alert, AlertDescription, AlertTitle } from "@openplane/ui";
import { Skeleton } from "@openplane/ui/components/skeleton";
import { useMemo } from "react";
import { ExecutionApprovalForm } from "../executions/execution-approval-form";
import { resolveApprovalNodeConfig } from "../executions/execution-approval-utils";
import { ExecutionInputForm } from "../executions/execution-input-form";
import { resolveInputNodeConfig } from "../executions/execution-input-utils";

type ExecutionDetail = RouterOutputs["agentCanvas"]["getExecution"];
type PendingApproval = RouterOutputs["agentCanvas"]["getPendingApproval"];

type ActionPanelContentProps = {
  waitingKind?: "input" | "approval";
  waitingExecutionId?: string;
  waitingNodeId?: string;
  executionCanvasLoading: boolean;
  executionCanvasError: { message: string } | null;
  executionCanvasNodes?: AgentCanvasNode[];
  executionDetail?: ExecutionDetail | null;
  approvalData?: PendingApproval;
  approvalLoading: boolean;
  approvalError: { message: string } | null;
};

export function ActionPanelContent({
  waitingKind,
  waitingExecutionId,
  waitingNodeId,
  executionCanvasLoading,
  executionCanvasError,
  executionCanvasNodes,
  approvalData,
  approvalLoading,
  approvalError,
}: ActionPanelContentProps) {
  const waitingNode = useMemo(() => {
    if (!(waitingNodeId && executionCanvasNodes)) {
      return;
    }
    return executionCanvasNodes.find((node) => node.id === waitingNodeId);
  }, [executionCanvasNodes, waitingNodeId]);

  const waitingInputConfig = useMemo(
    () =>
      waitingKind === "input" && waitingNode
        ? resolveInputNodeConfig(waitingNode)
        : undefined,
    [waitingKind, waitingNode]
  );

  const waitingApprovalConfig = useMemo(
    () =>
      waitingKind === "approval" && waitingNode
        ? resolveApprovalNodeConfig(waitingNode)
        : undefined,
    [waitingKind, waitingNode]
  );

  if (executionCanvasLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    );
  }

  if (executionCanvasError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load input</AlertTitle>
        <AlertDescription>{executionCanvasError.message}</AlertDescription>
      </Alert>
    );
  }

  if (waitingKind === "input") {
    if (
      waitingNode &&
      waitingInputConfig &&
      waitingExecutionId &&
      waitingNodeId
    ) {
      return (
        <ExecutionInputForm
          config={waitingInputConfig}
          executionId={waitingExecutionId}
          nodeId={waitingNodeId}
        />
      );
    }

    return (
      <Alert variant="destructive">
        <AlertTitle>Input configuration missing</AlertTitle>
        <AlertDescription>
          This execution is waiting for input, but the input node configuration
          could not be loaded.
        </AlertDescription>
      </Alert>
    );
  }

  if (approvalLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-40" />
      </div>
    );
  }

  if (approvalError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load approval</AlertTitle>
        <AlertDescription>{approvalError.message}</AlertDescription>
      </Alert>
    );
  }

  if (
    waitingNode &&
    waitingApprovalConfig &&
    approvalData &&
    waitingExecutionId &&
    waitingNodeId
  ) {
    const expiresAt = approvalData.expiresAt
      ? new Date(approvalData.expiresAt).getTime()
      : undefined;

    return (
      <ExecutionApprovalForm
        approvalId={approvalData.id}
        config={waitingApprovalConfig}
        executionId={waitingExecutionId}
        expiresAt={expiresAt}
        nodeId={waitingNodeId}
        requestMessage={approvalData.requestMessage}
      />
    );
  }

  return (
    <Alert variant={waitingKind === "approval" ? "warning" : "destructive"}>
      <AlertTitle>
        {waitingKind === "approval"
          ? "Approval request pending"
          : "Input configuration missing"}
      </AlertTitle>
      <AlertDescription>
        {waitingKind === "approval"
          ? "The approval request is being created. This should update in a few seconds."
          : "This execution is waiting for input, but the input node configuration could not be loaded."}
      </AlertDescription>
    </Alert>
  );
}
