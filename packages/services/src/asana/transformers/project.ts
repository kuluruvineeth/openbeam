import type { AsanaTransformContext } from "@openbeam/types/services/connectors/asana";
import type { GenericDocument } from "@openbeam/vespa";
import type { AsanaProject } from "../api/projects";

export function transformAsanaProject(
  project: AsanaProject,
  context: AsanaTransformContext
): GenericDocument {
  const createdAt = new Date(project.created_at).getTime();
  const updatedAt = new Date(project.modified_at).getTime();

  return {
    id: `${context.connectorId}_project_${project.gid}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: project.gid,
    document_type: "project",
    title: project.name,
    content: project.notes ?? "",
    author_name: project.owner?.name,
    created_at: createdAt,
    updated_at: updatedAt,
    url: project.permalink_url,
    is_public: project.public,
    access_control: [],
    metadata: {
      ...(project.owner && { owner: project.owner.name }),
      ...(project.team && { team: project.team.name }),
      ...(project.color && { color: project.color }),
      ...(project.current_status && {
        status: project.current_status.text,
        statusColor: project.current_status.color,
      }),
      archived: String(project.archived),
    },
  };
}
