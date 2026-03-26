import type { ProcoreTransformContext } from "@openbeam/types/services/connectors/procore";
import type { GenericDocument } from "@openbeam/vespa";
import type { ProcoreProject } from "../api/projects";
import { buildProjectUrl, formatAddress } from "./utils";

export function transformProcoreProject(
  project: ProcoreProject,
  context: ProcoreTransformContext
): GenericDocument {
  const address = formatAddress({
    address: project.address,
    city: project.city,
    stateCode: project.state_code,
    zip: project.zip,
    countryCode: project.country_code,
  });

  const parts = [
    project.description,
    address ? `Location: ${address}` : null,
    project.stage ? `Stage: ${project.stage}` : null,
    project.total_value ? `Total Value: ${project.total_value}` : null,
    project.start_date ? `Start: ${project.start_date}` : null,
    project.estimated_completion_date
      ? `Est. Completion: ${project.estimated_completion_date}`
      : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(project.created_at).getTime();
  const updatedAt = new Date(project.updated_at).getTime();

  return {
    id: `${context.connectorId}_project_${project.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(project.id),
    document_type: "project",
    document_subtype: project.stage ?? undefined,
    title: project.display_name || project.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildProjectUrl(project.id),
    is_public: false,
    access_control: [],
    metadata: {
      ...(project.project_number && {
        projectNumber: project.project_number,
      }),
      ...(project.stage && { stage: project.stage }),
      ...(address && { address }),
      ...(project.total_value && { totalValue: project.total_value }),
      active: String(project.active),
      ...(project.company && { companyName: project.company.name }),
    },
  };
}
