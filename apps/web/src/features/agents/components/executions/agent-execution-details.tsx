"use client";

import type { RouterOutputs } from "@openplane/api/routers/index";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@openplane/ui/components/alert";
import type { BadgeProps } from "@openplane/ui/components/badge";
import { Badge } from "@openplane/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@openplane/ui/components/card";
import { Skeleton } from "@openplane/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { ExecutionApprovalForm } from "./execution-approval-form";
import {
  getWaitingApprovalNodeId,
  resolveApprovalNodeConfig,
} from "./execution-approval-utils";
import { ExecutionInputForm } from "./execution-input-form";
import {
  getWaitingInputNodeId,
  resolveInputNodeConfig,
} from "./execution-input-utils";

type ExecutionRecord = RouterOutputs["agentCanvas"]["getExecution"];
type ExecutionCanvas = RouterOutputs["agentCanvas"]["getExecutionCanvas"];
type ExecutionStatus = ExecutionRecord["status"];

const STATUS_LABELS: Record<ExecutionStatus, string> = {
  PENDING: "Pending",
  RUNNING: "Running",
  WAITING_APPROVAL: "Waiting approval",
  WAITING_INPUT: "Waiting input",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  TIMED_OUT: "Timed out",
};

const STATUS_VARIANTS: Record<ExecutionStatus, BadgeProps["variant"]> = {
  PENDING: "outline",
  RUNNING: "secondary",
  WAITING_APPROVAL: "node-warning",
  WAITING_INPUT: "node-warning",
  COMPLETED: "default",
  FAILED: "destructive",
  CANCELLED: "outline",
  TIMED_OUT: "destructive",
};

const ACTIVE_STATUSES: Set<ExecutionStatus> = new Set([
  "PENDING",
  "RUNNING",
  "WAITING_APPROVAL",
  "WAITING_INPUT",
]);

const POLLING_INTERVAL_MS = 2000;

const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatTimestamp(value: Date | null | undefined): string {
  if (!value) {
    return "—";
  }
  return timestampFormatter.format(value);
}

function getNodeLabel(node: ExecutionCanvas["nodes"][number]): string {
  if (node.data && typeof node.data === "object") {
    const record = node.data as Record<string, unknown>;
    if (typeof record.label === "string" && record.label.trim()) {
      return record.label;
    }
  }
  return "Input";
}

type AgentExecutionDetailsProps = {
  executionId: string;
  agentId: string;
};

export function AgentExecutionDetails({
  executionId,
  agentId,
}: AgentExecutionDetailsProps) {
  const trpc = useTRPC();
  const executionQuery = useQuery({
    ...trpc.agentCanvas.getExecution.queryOptions({ executionId }),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && ACTIVE_STATUSES.has(status)) {
        return POLLING_INTERVAL_MS;
      }
      return false;
    },
  });
  const canvasQuery = useQuery(
    trpc.agentCanvas.getExecutionCanvas.queryOptions({ executionId })
  );
  const approvalNodeId =
    executionQuery.data?.status === "WAITING_APPROVAL"
      ? getWaitingApprovalNodeId(executionQuery.data)
      : undefined;
  const approvalQuery = useQuery({
    ...trpc.agentCanvas.getPendingApproval.queryOptions({
      executionId,
      nodeId: approvalNodeId ?? "",
    }),
    enabled: Boolean(approvalNodeId),
  });

  if (executionQuery.isLoading || canvasQuery.isLoading) {
    return <ExecutionDetailsSkeleton />;
  }

  if (executionQuery.error || canvasQuery.error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Unable to load execution</AlertTitle>
          <AlertDescription>
            {executionQuery.error?.message ??
              canvasQuery.error?.message ??
              "Execution data could not be loaded."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const execution = executionQuery.data;
  const canvas = canvasQuery.data;

  if (!(execution && canvas)) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Execution not found</AlertTitle>
          <AlertDescription>
            The execution details could not be loaded.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const inputNodeId = getWaitingInputNodeId(execution);
  const inputNode = inputNodeId
    ? canvas.nodes.find((node) => node.id === inputNodeId)
    : undefined;
  const inputConfig = inputNode ? resolveInputNodeConfig(inputNode) : undefined;
  const approvalNode = approvalNodeId
    ? canvas.nodes.find((node) => node.id === approvalNodeId)
    : undefined;
  const approvalConfig = approvalNode
    ? resolveApprovalNodeConfig(approvalNode)
    : undefined;
  const statusLabel = STATUS_LABELS[execution.status];
  const statusVariant = STATUS_VARIANTS[execution.status];
  const errorMessages = execution.error
    ? execution.error
        .split(";")
        .map((message) => message.trim())
        .filter((message) => message.length > 0)
    : [];
  const approvalBody = (() => {
    if (approvalQuery.isLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-32" />
        </div>
      );
    }
    if (approvalQuery.error) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Unable to load approval</AlertTitle>
          <AlertDescription>{approvalQuery.error.message}</AlertDescription>
        </Alert>
      );
    }
    if (approvalNode && approvalConfig && approvalQuery.data) {
      return (
        <ExecutionApprovalForm
          approvalId={approvalQuery.data.id}
          config={approvalConfig}
          executionId={execution.id}
          expiresAt={
            approvalQuery.data.expiresAt
              ? new Date(approvalQuery.data.expiresAt).getTime()
              : undefined
          }
          nodeId={approvalNode.id}
          requestMessage={approvalQuery.data.requestMessage}
        />
      );
    }
    return (
      <Alert variant="warning">
        <AlertTitle>Approval request pending</AlertTitle>
        <AlertDescription>
          The approval request is being created. This should update in a few
          seconds.
        </AlertDescription>
      </Alert>
    );
  })();

  const actionCard = (() => {
    if (execution.status === "WAITING_APPROVAL") {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Approval required</CardTitle>
            <CardDescription>
              {approvalNode
                ? getNodeLabel(approvalNode)
                : "Waiting for approval."}
            </CardDescription>
          </CardHeader>
          <CardContent>{approvalBody}</CardContent>
        </Card>
      );
    }
    if (execution.status === "WAITING_INPUT") {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Input required</CardTitle>
            <CardDescription>
              {inputNode ? getNodeLabel(inputNode) : "Waiting for user input."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {inputNode && inputConfig ? (
              <ExecutionInputForm
                config={inputConfig}
                executionId={execution.id}
                key={inputNode.id}
                nodeId={inputNode.id}
              />
            ) : (
              <Alert variant="destructive">
                <AlertTitle>Input configuration missing</AlertTitle>
                <AlertDescription>
                  This execution is waiting for input, but the input node
                  configuration could not be loaded.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inputs</CardTitle>
          <CardDescription>No input required at this step.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Waiting input will appear here when required.
          </p>
        </CardContent>
      </Card>
    );
  })();

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl">Execution</h1>
          <p className="text-muted-foreground text-sm">{executionId}</p>
        </div>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Execution context and timing.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <ExecutionMeta label="Agent" value={agentId} />
              <ExecutionMeta
                label="Version"
                value={`v${execution.versionNumber}`}
              />
              <ExecutionMeta
                label="Triggered by"
                value={execution.triggeredBy?.name ?? "—"}
              />
              <ExecutionMeta label="Status" value={statusLabel} />
              <ExecutionMeta
                label="Started"
                value={formatTimestamp(execution.startedAt)}
              />
              <ExecutionMeta
                label="Completed"
                value={formatTimestamp(execution.completedAt)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Node</CardTitle>
            <CardDescription>Execution position.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Node ID</span>
                <span className="font-medium">
                  {execution.currentNodeId ?? "—"}
                </span>
              </div>
              {inputNode && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Input</span>
                  <span className="font-medium">{getNodeLabel(inputNode)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {errorMessages.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Execution failed</AlertTitle>
          <AlertDescription>
            {errorMessages.length === 1 ? (
              errorMessages[0]
            ) : (
              <ul className="list-disc space-y-1 pl-4">
                {errorMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      {actionCard}
    </div>
  );
}

function ExecutionMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs uppercase">{label}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  );
}

function ExecutionDetailsSkeleton() {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-48 w-full lg:col-span-2" />
        <Skeleton className="h-48 w-full" />
      </div>
      <Skeleton className="h-56 w-full" />
    </div>
  );
}
