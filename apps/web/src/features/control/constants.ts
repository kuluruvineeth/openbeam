import type {
  ApprovalStatus,
  ControlAgentStatus,
  ControlIssuePriority,
  ControlIssueStatus,
  ControlProjectStatus,
  GoalStatus,
  HeartbeatRunStatus,
} from "@openbeam/types/control";

type StatusMeta = {
  label: string;
  color: string;
  dotColor: string;
};

export const AGENT_STATUS_META: Record<ControlAgentStatus, StatusMeta> = {
  ACTIVE: {
    label: "Active",
    color: "bg-emerald-500/10 text-emerald-600",
    dotColor: "bg-emerald-500",
  },
  IDLE: {
    label: "Idle",
    color: "bg-zinc-500/10 text-zinc-500",
    dotColor: "bg-zinc-400",
  },
  RUNNING: {
    label: "Running",
    color: "bg-blue-500/10 text-blue-600",
    dotColor: "bg-blue-500",
  },
  ERROR: {
    label: "Error",
    color: "bg-red-500/10 text-red-600",
    dotColor: "bg-red-500",
  },
  PAUSED: {
    label: "Paused",
    color: "bg-amber-500/10 text-amber-600",
    dotColor: "bg-amber-500",
  },
  PENDING_APPROVAL: {
    label: "Pending",
    color: "bg-violet-500/10 text-violet-600",
    dotColor: "bg-violet-500",
  },
  TERMINATED: {
    label: "Terminated",
    color: "bg-zinc-500/10 text-zinc-400",
    dotColor: "bg-zinc-300",
  },
};

export const ISSUE_STATUS_META: Record<ControlIssueStatus, StatusMeta> = {
  BACKLOG: {
    label: "Backlog",
    color: "bg-zinc-500/10 text-zinc-500",
    dotColor: "bg-zinc-400",
  },
  TODO: {
    label: "Todo",
    color: "bg-zinc-500/10 text-zinc-600",
    dotColor: "bg-zinc-500",
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "bg-blue-500/10 text-blue-600",
    dotColor: "bg-blue-500",
  },
  IN_REVIEW: {
    label: "In Review",
    color: "bg-violet-500/10 text-violet-600",
    dotColor: "bg-violet-500",
  },
  DONE: {
    label: "Done",
    color: "bg-emerald-500/10 text-emerald-600",
    dotColor: "bg-emerald-500",
  },
  BLOCKED: {
    label: "Blocked",
    color: "bg-red-500/10 text-red-600",
    dotColor: "bg-red-500",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-zinc-500/10 text-zinc-400",
    dotColor: "bg-zinc-300",
  },
};

export const ISSUE_PRIORITY_META: Record<
  ControlIssuePriority,
  StatusMeta & { icon: string }
> = {
  CRITICAL: {
    label: "Critical",
    color: "bg-red-500/10 text-red-600",
    dotColor: "bg-red-500",
    icon: "AlertCircle",
  },
  HIGH: {
    label: "High",
    color: "bg-orange-500/10 text-orange-600",
    dotColor: "bg-orange-500",
    icon: "ArrowUp",
  },
  MEDIUM: {
    label: "Medium",
    color: "bg-amber-500/10 text-amber-600",
    dotColor: "bg-amber-500",
    icon: "Minus",
  },
  LOW: {
    label: "Low",
    color: "bg-zinc-500/10 text-zinc-500",
    dotColor: "bg-zinc-400",
    icon: "ArrowDown",
  },
};

export const PROJECT_STATUS_META: Record<ControlProjectStatus, StatusMeta> = {
  BACKLOG: {
    label: "Backlog",
    color: "bg-zinc-500/10 text-zinc-500",
    dotColor: "bg-zinc-400",
  },
  PLANNED: {
    label: "Planned",
    color: "bg-violet-500/10 text-violet-600",
    dotColor: "bg-violet-500",
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "bg-blue-500/10 text-blue-600",
    dotColor: "bg-blue-500",
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-emerald-500/10 text-emerald-600",
    dotColor: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-zinc-500/10 text-zinc-400",
    dotColor: "bg-zinc-300",
  },
};

export const GOAL_STATUS_META: Record<GoalStatus, StatusMeta> = {
  PLANNED: {
    label: "Planned",
    color: "bg-zinc-500/10 text-zinc-500",
    dotColor: "bg-zinc-400",
  },
  ACTIVE: {
    label: "Active",
    color: "bg-blue-500/10 text-blue-600",
    dotColor: "bg-blue-500",
  },
  ACHIEVED: {
    label: "Achieved",
    color: "bg-emerald-500/10 text-emerald-600",
    dotColor: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-zinc-500/10 text-zinc-400",
    dotColor: "bg-zinc-300",
  },
};

export const APPROVAL_STATUS_META: Record<ApprovalStatus, StatusMeta> = {
  PENDING: {
    label: "Pending",
    color: "bg-amber-500/10 text-amber-600",
    dotColor: "bg-amber-500",
  },
  REVISION_REQUESTED: {
    label: "Revision",
    color: "bg-violet-500/10 text-violet-600",
    dotColor: "bg-violet-500",
  },
  APPROVED: {
    label: "Approved",
    color: "bg-emerald-500/10 text-emerald-600",
    dotColor: "bg-emerald-500",
  },
  REJECTED: {
    label: "Rejected",
    color: "bg-red-500/10 text-red-600",
    dotColor: "bg-red-500",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-zinc-500/10 text-zinc-400",
    dotColor: "bg-zinc-300",
  },
};

export const RUN_STATUS_META: Record<HeartbeatRunStatus, StatusMeta> = {
  QUEUED: {
    label: "Queued",
    color: "bg-zinc-500/10 text-zinc-500",
    dotColor: "bg-zinc-400",
  },
  RUNNING: {
    label: "Running",
    color: "bg-blue-500/10 text-blue-600",
    dotColor: "bg-blue-500",
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-emerald-500/10 text-emerald-600",
    dotColor: "bg-emerald-500",
  },
  FAILED: {
    label: "Failed",
    color: "bg-red-500/10 text-red-600",
    dotColor: "bg-red-500",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-zinc-500/10 text-zinc-400",
    dotColor: "bg-zinc-300",
  },
};

export const KANBAN_COLUMNS: ControlIssueStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "BLOCKED",
];
