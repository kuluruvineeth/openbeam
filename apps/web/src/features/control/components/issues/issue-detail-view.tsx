"use client";

import type {
  ControlIssuePriority,
  ControlIssueStatus,
} from "@openbeam/types/control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openbeam/ui";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { useTRPC } from "@/trpc/client";
import { ISSUE_STATUS_META } from "../../constants";
import {
  useAddIssueComment,
  useControlIssue,
  useUpdateIssue,
} from "../../hooks/use-control-issues";
import { AgentIdentity } from "../shared/agent-avatar";
import { CommentThread } from "../shared/comment-thread";
import { PriorityBadge } from "../shared/priority-badge";
import { PropertiesPanel } from "../shared/properties-panel";
import { StatusBadge } from "../shared/status-badge";
import { LabelPicker } from "./label-picker";

const STATUSES = Object.keys(ISSUE_STATUS_META) as ControlIssueStatus[];
const PRIORITIES: ControlIssuePriority[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
];

type IssueDetailViewProps = {
  issueId: string;
};

export function IssueDetailView({ issueId }: IssueDetailViewProps) {
  const trpc = useTRPC();
  const { issue, comments, isLoading } = useControlIssue(issueId);
  const updateIssue = useUpdateIssue();
  const addComment = useAddIssueComment(issueId);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  const { data: agents } = useQuery(
    trpc.control.agents.list.queryOptions({ limit: 50 })
  );

  if (isLoading || !issue) {
    return null;
  }

  const handleStatusChange = (status: string) => {
    updateIssue.mutate({ issueId, data: { status } });
  };

  const handlePriorityChange = (priority: string) => {
    updateIssue.mutate({ issueId, data: { priority } });
  };

  const handleAssigneeChange = (agentId: string) => {
    updateIssue.mutate({
      issueId,
      data: { assigneeAgentId: agentId === "none" ? null : agentId },
    });
  };

  const handleTitleSave = () => {
    if (editTitle.trim() && editTitle.trim() !== issue.title) {
      updateIssue.mutate({ issueId, data: { title: editTitle.trim() } });
    }
    setIsEditing(false);
  };

  const labelIds = (issue.labelAssignments ?? []).map(
    (l: { label: { id: string } }) => l.label.id
  );

  const properties = [
    {
      label: "Status",
      value: (
        <Select onValueChange={handleStatusChange} value={issue.status}>
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                <StatusBadge domain="issue" showDot size="sm" status={s} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      label: "Priority",
      value: (
        <Select onValueChange={handlePriorityChange} value={issue.priority}>
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                <PriorityBadge priority={p} size="sm" />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      label: "Assignee",
      value: (
        <Select
          onValueChange={handleAssigneeChange}
          value={issue.assigneeAgentId ?? "none"}
        >
          <SelectTrigger className="h-7 w-40 text-xs">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {(agents ?? []).map((agent: { id: string; name: string }) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      label: "Labels",
      value: <LabelPicker assignedLabelIds={labelIds} issueId={issueId} />,
    },
    {
      label: "Created",
      value: (
        <span className="text-xs">
          {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      label: "Updated",
      value: (
        <span className="text-xs">
          {formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Link
          className="transition-colors hover:text-foreground"
          href="/control/issues"
        >
          Issues
        </Link>
        <Icons.ChevronRight size={12} />
        <span className="font-mono">{issue.identifier}</span>
      </div>

      <div className="flex gap-6">
        <div className="min-w-0 flex-1 space-y-6">
          {isEditing ? (
            <div className="flex gap-2">
              <input
                autoFocus
                className="flex-1 bg-transparent font-semibold text-lg outline-none"
                onBlur={handleTitleSave}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTitleSave();
                  }
                  if (e.key === "Escape") {
                    setIsEditing(false);
                  }
                }}
                value={editTitle}
              />
            </div>
          ) : (
            <button
              className="cursor-pointer text-left font-semibold text-lg transition-colors hover:text-muted-foreground"
              onClick={() => {
                setEditTitle(issue.title);
                setIsEditing(true);
              }}
              type="button"
            >
              {issue.title}
            </button>
          )}

          {issue.description && (
            <p className="whitespace-pre-wrap text-muted-foreground text-sm">
              {issue.description}
            </p>
          )}

          {issue.assigneeAgent && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Assigned to</span>
              <AgentIdentity
                name={issue.assigneeAgent.name}
                size="sm"
                status={issue.assigneeAgent.status}
              />
            </div>
          )}

          {(issue.labelAssignments ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(issue.labelAssignments ?? []).map(
                (l: { label: { id: string; name: string; color: string } }) => (
                  <span
                    className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs"
                    key={l.label.id}
                    style={{
                      backgroundColor: `${l.label.color}20`,
                      color: l.label.color,
                    }}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: l.label.color }}
                    />
                    {l.label.name}
                  </span>
                )
              )}
            </div>
          )}

          <div className="pt-2">
            <h2 className="mb-3 font-medium text-sm">Activity</h2>
            <CommentThread
              comments={comments}
              isSubmitting={addComment.isPending}
              onAddComment={(body) => addComment.mutate({ issueId, body })}
            />
          </div>
        </div>

        <div className="w-64 shrink-0">
          <PropertiesPanel properties={properties} />
        </div>
      </div>
    </div>
  );
}
