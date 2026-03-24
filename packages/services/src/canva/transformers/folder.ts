import type { CanvaTransformContext } from "@openbeam/types/services/connectors/canva";
import type { GenericDocument } from "@openbeam/vespa";
import type { CanvaFolder } from "../api/folders";

export function transformCanvaFolder(
  folder: CanvaFolder,
  context: CanvaTransformContext
): GenericDocument {
  const createdAt = new Date(folder.created_at).getTime();
  const updatedAt = new Date(folder.updated_at).getTime();

  return {
    id: `${context.connectorId}_folder_${folder.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: folder.id,
    document_type: "folder",
    title: folder.name,
    content: `Canva folder: ${folder.name}`,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `https://www.canva.com/folder/${folder.id}`,
    is_public: false,
    access_control: [],
    metadata: {},
  };
}
