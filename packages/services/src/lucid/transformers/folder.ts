import type { LucidTransformContext } from "@openbeam/types/services/connectors/lucid";
import type { GenericDocument } from "@openbeam/vespa";
import type { LucidFolder } from "../api/folders";

export function transformLucidFolder(
  folder: LucidFolder,
  context: LucidTransformContext
): GenericDocument {
  const parts = [
    folder.type ? `Type: ${folder.type}` : null,
    folder.parentId ? `Parent: ${folder.parentId}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(folder.createdDate).getTime();
  const updatedAt = new Date(folder.lastModifiedDate).getTime();

  return {
    id: `${context.connectorId}_folder_${folder.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: folder.id,
    document_type: "folder",
    title: folder.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `https://lucid.app/folder/${folder.id}`,
    is_public: false,
    access_control: [],
    metadata: {
      ...(folder.type && { folderType: folder.type }),
      ...(folder.parentId && { parentId: folder.parentId }),
    },
  };
}
