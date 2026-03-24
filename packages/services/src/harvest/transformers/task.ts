import type { HarvestTransformContext } from "@openbeam/types/services/connectors/harvest";
import type { GenericDocument } from "@openbeam/vespa";
import type { HarvestTask } from "../api/tasks";

export function transformHarvestTask(
  task: HarvestTask,
  context: HarvestTransformContext
): GenericDocument {
  const parts = [
    task.billable_by_default
      ? "Billable by default"
      : "Non-billable by default",
    task.is_active ? "Active" : "Archived",
    task.default_hourly_rate !== null
      ? `Default rate: ${task.default_hourly_rate}/hr`
      : null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_task_${task.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(task.id),
    document_type: "task",
    document_subtype: task.is_active ? "active" : "archived",
    title: task.name,
    content: parts.join(" — "),
    created_at: new Date(task.created_at).getTime(),
    updated_at: new Date(task.updated_at).getTime(),
    url: `${context.baseUrl}/tasks`,
    is_public: false,
    access_control: [],
    metadata: {
      active: String(task.is_active),
      billableByDefault: String(task.billable_by_default),
      ...(task.default_hourly_rate !== null && {
        defaultHourlyRate: String(task.default_hourly_rate),
      }),
    },
  };
}
