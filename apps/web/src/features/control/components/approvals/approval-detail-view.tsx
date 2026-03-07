"use client";

import { Separator } from "@openbeam/ui";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Icons } from "@/components/icons";
import {
  useAddApprovalComment,
  useControlApproval,
} from "../../hooks/use-control-approvals";
import { CommentThread } from "../shared/comment-thread";
import { PropertiesPanel } from "../shared/properties-panel";
import { StatusBadge } from "../shared/status-badge";
import { ApprovalActions } from "./approval-actions";
import { ApprovalDetailSkeleton } from "./approval-detail-skeleton";

const TYPE_LABELS: Record<string, string> = {
  HIRE_AGENT: "Hire Agent",
  APPROVE_CEO_STRATEGY: "CEO Strategy",
};

type ApprovalDetailViewProps = {
  approvalId: string;
};

export function ApprovalDetailView({ approvalId }: ApprovalDetailViewProps) {
  const { data: approval, isLoading } = useControlApproval(approvalId);
  const addComment = useAddApprovalComment(approvalId);

  if (isLoading || !approval) {
    return <ApprovalDetailSkeleton />;
  }

  const isPending =
    approval.status === "PENDING" || approval.status === "REVISION_REQUESTED";

  const properties = [
    { label: "Type", value: TYPE_LABELS[approval.type] ?? approval.type },
    {
      label: "Status",
      value: <StatusBadge domain="approval" status={approval.status} />,
    },
    {
      label: "Created",
      value: format(new Date(approval.createdAt), "MMM d, yyyy HH:mm"),
    },
    ...(approval.decidedAt
      ? [
          {
            label: "Decided",
            value: formatDistanceToNow(new Date(approval.decidedAt), {
              addSuffix: true,
            }),
          },
        ]
      : []),
    ...(approval.decisionNote
      ? [{ label: "Decision Note", value: approval.decisionNote }]
      : []),
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Link
          className="text-muted-foreground transition-colors hover:text-foreground"
          href="/control/approvals"
        >
          <Icons.ArrowLeft size={16} />
        </Link>
        <h1 className="font-semibold text-lg">
          {TYPE_LABELS[approval.type] ?? approval.type}
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <PropertiesPanel properties={properties} />

          {approval.payload && (
            <>
              <Separator />
              <div>
                <h2 className="mb-2 font-medium text-sm">Payload</h2>
                <pre className="overflow-auto rounded-sm border border-border/50 bg-muted/50 p-3 text-xs">
                  {JSON.stringify(approval.payload, null, 2)}
                </pre>
              </div>
            </>
          )}

          {isPending && (
            <>
              <Separator />
              <ApprovalActions approvalId={approvalId} />
            </>
          )}
        </div>

        <div className="space-y-4">
          {approval.issueLinks && approval.issueLinks.length > 0 && (
            <div>
              <h3 className="mb-2 font-medium text-sm">Linked Issues</h3>
              <div className="space-y-1">
                {approval.issueLinks.map(
                  (link: {
                    issue: {
                      id: string;
                      title: string;
                      identifier: string | null;
                    };
                  }) => (
                    <Link
                      className="block rounded-sm border border-border/50 p-2 text-xs transition-colors hover:border-border"
                      href={`/control/issues/${link.issue.id}`}
                      key={link.issue.id}
                    >
                      {link.issue.title}
                    </Link>
                  )
                )}
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 font-medium text-sm">Comments</h3>
            <CommentThread
              comments={approval.comments ?? []}
              isSubmitting={addComment.isPending}
              onAddComment={(body) => addComment.mutate({ approvalId, body })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
