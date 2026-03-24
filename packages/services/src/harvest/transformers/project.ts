import type { HarvestTransformContext } from "@openbeam/types/services/connectors/harvest";
import type { GenericDocument } from "@openbeam/vespa";
import type { HarvestProject } from "../api/projects";

export function transformHarvestProject(
  project: HarvestProject,
  context: HarvestTransformContext
): GenericDocument {
  const parts = [
    `Client: ${project.client.name}`,
    project.code ? `Code: ${project.code}` : null,
    `Bill by: ${project.bill_by}`,
    project.budget !== null ? `Budget: ${project.budget}` : null,
    project.notes || null,
    project.is_active ? "Active" : "Archived",
    project.is_billable ? "Billable" : "Non-billable",
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_project_${project.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(project.id),
    document_type: "project",
    document_subtype: project.is_active ? "active" : "archived",
    title: project.name,
    content: parts.join(" — "),
    created_at: new Date(project.created_at).getTime(),
    updated_at: new Date(project.updated_at).getTime(),
    url: `${context.baseUrl}/projects/${project.id}`,
    is_public: false,
    access_control: [],
    metadata: {
      clientName: project.client.name,
      ...(project.code && { code: project.code }),
      billBy: project.bill_by,
      budgetBy: project.budget_by,
      active: String(project.is_active),
      billable: String(project.is_billable),
      ...(project.budget !== null && { budget: String(project.budget) }),
      ...(project.fee !== null && { fee: String(project.fee) }),
      ...(project.starts_on && { startsOn: project.starts_on }),
      ...(project.ends_on && { endsOn: project.ends_on }),
    },
  };
}
