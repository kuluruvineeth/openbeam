import type { HarvestTransformContext } from "@openbeam/types/services/connectors/harvest";
import type { GenericDocument } from "@openbeam/vespa";
import type { HarvestTimeEntry } from "../api/time-entries";

export function transformHarvestTimeEntry(
  entry: HarvestTimeEntry,
  context: HarvestTransformContext
): GenericDocument {
  const parts = [
    `Project: ${entry.project.name}`,
    `Task: ${entry.task.name}`,
    `Hours: ${entry.hours}`,
    entry.notes ? `Notes: ${entry.notes}` : null,
    `User: ${entry.user.name}`,
    `Client: ${entry.client.name}`,
    entry.billable ? "Billable" : "Non-billable",
  ].filter(Boolean);

  const title = `${entry.project.name} - ${entry.task.name} (${entry.hours}h)`;

  return {
    id: `${context.connectorId}_time_entry_${entry.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(entry.id),
    document_type: "time_entry",
    document_subtype: entry.billable ? "billable" : "non-billable",
    title,
    content: parts.join(" — "),
    created_at: new Date(entry.created_at).getTime(),
    updated_at: new Date(entry.updated_at).getTime(),
    url: `${context.baseUrl}/time`,
    author_name: entry.user.name,
    is_public: false,
    access_control: [],
    metadata: {
      hours: String(entry.hours),
      spentDate: entry.spent_date,
      projectName: entry.project.name,
      taskName: entry.task.name,
      clientName: entry.client.name,
      userName: entry.user.name,
      billable: String(entry.billable),
      ...(entry.is_running && { isRunning: "true" }),
      ...(entry.billable_rate !== null && {
        billableRate: String(entry.billable_rate),
      }),
    },
  };
}
