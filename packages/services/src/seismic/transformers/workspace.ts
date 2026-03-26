import type { SeismicTransformContext } from "@openbeam/types/services/connectors/seismic";
import type { GenericDocument } from "@openbeam/vespa";
import type { SeismicWorkspace } from "../api/workspaces";

export function transformSeismicWorkspace(
  workspace: SeismicWorkspace,
  context: SeismicTransformContext
): GenericDocument {
  const body = workspace.description ?? "";
  const createdAt = new Date(workspace.createdAt).getTime();
  const updatedAt = new Date(workspace.modifiedAt).getTime();

  return {
    id: `${context.connectorId}_workspace_${workspace.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: workspace.id,
    document_type: "workspace",
    title: workspace.name,
    content: body,
    created_at: createdAt,
    updated_at: updatedAt,
    url: "",
    is_public: false,
    access_control: [],
    metadata: {
      ...(workspace.isDefault !== undefined && {
        isDefault: String(workspace.isDefault),
      }),
    },
  };
}
