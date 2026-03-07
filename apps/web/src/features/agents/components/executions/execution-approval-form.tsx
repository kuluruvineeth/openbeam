"use client";

import type {
  ApprovalNodeConfig,
  ApprovalSeverity,
} from "@openbeam/types/canvas";
import { Label } from "@openbeam/ui/components/label";
import { Textarea } from "@openbeam/ui/components/textarea";
import { cn } from "@openbeam/ui/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

export type ExecutionApprovalFormProps = {
  approvalId: string;
  executionId: string;
  nodeId: string;
  config: ApprovalNodeConfig;
  requestMessage?: string | null;
  expiresAt?: number | null;
};

const SEVERITY_STYLES: Record<ApprovalSeverity, string> = {
  low: "bg-muted/50 text-muted-foreground",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  high: "bg-destructive/10 text-destructive",
  critical: "bg-destructive/15 text-destructive font-medium",
};

const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatTimestamp(value: number | null | undefined): string | undefined {
  if (!value) {
    return;
  }
  return timestampFormatter.format(new Date(value));
}

export function ExecutionApprovalForm({
  approvalId,
  executionId,
  nodeId,
  config,
  requestMessage,
  expiresAt,
}: ExecutionApprovalFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const allowedActions = useMemo(
    () => new Set(config.allowedActions),
    [config.allowedActions]
  );
  const approveLabel = config.customLabels?.approve ?? "Approve";
  const rejectLabel = config.customLabels?.reject ?? "Reject";
  const message =
    requestMessage && requestMessage.trim().length > 0
      ? requestMessage
      : config.message;
  const requireComment = config.requireComment;
  const trimmedComment = comment.trim();
  const commentMissing = requireComment && trimmedComment.length === 0;
  const severityStyle = SEVERITY_STYLES[config.severity];
  const expiresLabel = formatTimestamp(expiresAt);
  const commentId = `${approvalId}-comment`;

  const pendingApprovalQueryKey =
    trpc.agentCanvas.getPendingApproval.queryOptions({
      executionId,
      nodeId,
    }).queryKey;

  const listPendingApprovalsQueryKey =
    trpc.agentCanvas.listPendingApprovals.queryOptions().queryKey;

  const submitMutation = useMutation({
    ...trpc.agentCanvas.respondToApproval.mutationOptions(),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: pendingApprovalQueryKey });
      await queryClient.cancelQueries({
        queryKey: listPendingApprovalsQueryKey,
      });

      const previousPendingApproval = queryClient.getQueryData(
        pendingApprovalQueryKey
      );
      const previousListPendingApprovals = queryClient.getQueryData(
        listPendingApprovalsQueryKey
      );

      queryClient.setQueryData(pendingApprovalQueryKey, null);

      if (Array.isArray(previousListPendingApprovals)) {
        const filtered = previousListPendingApprovals.filter(
          (approval: { id: string }) => approval.id !== variables.approvalId
        );
        queryClient.setQueryData(listPendingApprovalsQueryKey, filtered);
      }

      return { previousPendingApproval, previousListPendingApprovals };
    },
    onSuccess: () => {
      toast.success("Approval response sent");
      queryClient.invalidateQueries({
        queryKey: trpc.agentCanvas.getExecution.queryOptions({ executionId })
          .queryKey,
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousPendingApproval !== undefined) {
        queryClient.setQueryData(
          pendingApprovalQueryKey,
          context.previousPendingApproval
        );
      }
      if (context?.previousListPendingApprovals !== undefined) {
        queryClient.setQueryData(
          listPendingApprovalsQueryKey,
          context.previousListPendingApprovals
        );
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pendingApprovalQueryKey });
      queryClient.invalidateQueries({ queryKey: listPendingApprovalsQueryKey });
    },
  });

  const handleSubmit = useCallback(
    (status: "APPROVED" | "REJECTED") => {
      setAttemptedSubmit(true);
      if (commentMissing) {
        toast.error("Add a comment to continue");
        return;
      }
      submitMutation.mutate({
        approvalId,
        status,
        responseMessage: trimmedComment.length > 0 ? trimmedComment : undefined,
      });
    },
    [approvalId, commentMissing, submitMutation, trimmedComment]
  );

  const isSubmitting = submitMutation.isPending;

  useHotkeys(
    "mod+enter",
    () => {
      if (allowedActions.has("approve") && !isSubmitting) {
        handleSubmit("APPROVED");
      }
    },
    { enableOnFormTags: true },
    [allowedActions, isSubmitting, handleSubmit]
  );

  useHotkeys(
    "mod+backspace",
    () => {
      if (allowedActions.has("reject") && !isSubmitting) {
        handleSubmit("REJECTED");
      }
    },
    { enableOnFormTags: true },
    [allowedActions, isSubmitting, handleSubmit]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-sm px-2 py-0.5 font-medium text-[11px]",
              severityStyle
            )}
          >
            {config.severity.charAt(0).toUpperCase() + config.severity.slice(1)}
          </span>
          {expiresLabel ? (
            <span className="text-[11px] text-muted-foreground/70">
              Expires {expiresLabel}
            </span>
          ) : null}
        </div>
        <p className="text-[13px] leading-relaxed">{message}</p>
      </div>

      <div className="space-y-1.5">
        <Label
          className={cn(
            "text-[13px] text-muted-foreground",
            attemptedSubmit && commentMissing && "text-destructive"
          )}
          htmlFor={commentId}
        >
          Comment{requireComment ? " *" : ""}
        </Label>
        <Textarea
          aria-invalid={attemptedSubmit && commentMissing ? true : undefined}
          className={cn(
            "min-h-[72px] resize-none border-border/40 text-[13px] focus-visible:border-border focus-visible:ring-0",
            attemptedSubmit && commentMissing && "border-destructive/60"
          )}
          disabled={isSubmitting}
          id={commentId}
          onChange={(event) => setComment(event.target.value)}
          placeholder={requireComment ? "Required" : "Optional"}
          rows={3}
          value={comment}
        />
        {attemptedSubmit && commentMissing ? (
          <p className="text-[11px] text-destructive">Comment required</p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        {allowedActions.has("reject") ? (
          <button
            className="h-8 rounded-sm px-3 text-[13px] text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
            disabled={isSubmitting}
            onClick={() => handleSubmit("REJECTED")}
            type="button"
          >
            {rejectLabel}
          </button>
        ) : null}
        {allowedActions.has("approve") ? (
          <button
            className="h-8 rounded-sm bg-foreground px-4 font-medium text-[13px] text-background transition-colors hover:bg-foreground/90 disabled:pointer-events-none disabled:opacity-50"
            disabled={isSubmitting}
            onClick={() => handleSubmit("APPROVED")}
            type="button"
          >
            {approveLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
