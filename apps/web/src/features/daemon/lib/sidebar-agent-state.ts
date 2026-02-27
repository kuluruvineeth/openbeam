import type { AgentLifecycleStatus } from "@openplane/types/services/daemon";

export type SidebarAttentionReason =
  | "finished"
  | "error"
  | "permission"
  | null
  | undefined;

export type SidebarStateBucket =
  | "needs_input"
  | "failed"
  | "running"
  | "attention"
  | "done";

export function deriveSidebarStateBucket(input: {
  status: AgentLifecycleStatus;
  requiresAttention?: boolean;
  attentionReason?: SidebarAttentionReason;
}): SidebarStateBucket {
  if (input.requiresAttention && input.attentionReason === "permission") {
    return "needs_input";
  }
  if (input.status === "error" || input.attentionReason === "error") {
    return "failed";
  }
  if (input.status === "running") {
    return "running";
  }
  if (input.requiresAttention) {
    return "attention";
  }
  return "done";
}

export function isSidebarActiveAgent(input: {
  status: AgentLifecycleStatus;
  requiresAttention?: boolean;
  attentionReason?: SidebarAttentionReason;
}): boolean {
  return deriveSidebarStateBucket(input) !== "done";
}
