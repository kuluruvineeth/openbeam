"use client";

import { Button, Textarea } from "@openbeam/ui";
import { useState } from "react";
import {
  useApproveApproval,
  useRejectApproval,
  useRequestRevision,
} from "../../hooks/use-control-approvals";

type ApprovalActionsProps = {
  approvalId: string;
};

export function ApprovalActions({ approvalId }: ApprovalActionsProps) {
  const [note, setNote] = useState("");
  const approve = useApproveApproval();
  const reject = useRejectApproval();
  const revision = useRequestRevision();

  const isPending = approve.isPending || reject.isPending || revision.isPending;

  const handleAction = (
    action: typeof approve | typeof reject | typeof revision
  ) => {
    action.mutate({
      approvalId,
      decisionNote: note.trim() || undefined,
    });
  };

  return (
    <div className="space-y-3">
      <Textarea
        className="min-h-[60px] resize-none text-sm"
        disabled={isPending}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Decision note (optional)"
        rows={2}
        value={note}
      />
      <div className="flex items-center gap-2">
        <Button
          disabled={isPending}
          onClick={() => handleAction(approve)}
          size="sm"
        >
          {approve.isPending ? "Approving..." : "Approve"}
        </Button>
        <Button
          disabled={isPending}
          onClick={() => handleAction(revision)}
          size="sm"
          variant="outline"
        >
          {revision.isPending ? "Requesting..." : "Request Revision"}
        </Button>
        <Button
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          disabled={isPending}
          onClick={() => handleAction(reject)}
          size="sm"
          variant="ghost"
        >
          {reject.isPending ? "Rejecting..." : "Reject"}
        </Button>
      </div>
    </div>
  );
}
