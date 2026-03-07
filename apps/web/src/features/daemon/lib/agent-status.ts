import type { AgentLifecycleStatus } from "@openbeam/types/services/daemon";

const STATUS_COLOR_MAP: Record<AgentLifecycleStatus, string> = {
  initializing: "#f59e0b",
  idle: "#22c55e",
  running: "#3b82f6",
  error: "#ef4444",
  closed: "#6b7280",
};

const STATUS_LABEL_MAP: Record<AgentLifecycleStatus, string> = {
  initializing: "Initializing",
  idle: "Idle",
  running: "Running",
  error: "Error",
  closed: "Closed",
};

export function getAgentStatusColor(status: AgentLifecycleStatus): string {
  return STATUS_COLOR_MAP[status] ?? "#6b7280";
}

export function getAgentStatusLabel(status: AgentLifecycleStatus): string {
  return STATUS_LABEL_MAP[status] ?? "Unknown";
}
