const EVENT_TYPE_ALIASES: Record<string, string> = {
  approval_requested: "approval.requested",
  approval_resolved: "approval.resolved",
  run_started: "run.started",
  run_completed: "run.completed",
  run_failed: "run.failed",
  task_claimed: "task.claimed",
  task_completed: "task.completed",
  task_failed: "task.failed",
  tool_started: "tool.started",
  tool_completed: "tool.completed",
  tool_failed: "tool.failed",
  mission_started: "mission.started",
  mission_completed: "mission.completed",
  mission_failed: "mission.failed",
  mission_cancelled: "mission.cancelled",
  artifact_published: "artifact.published",
};

export function normalizeMissionEventType(eventType: string): string {
  return EVENT_TYPE_ALIASES[eventType] ?? eventType;
}
