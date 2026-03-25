import type { PanoptoTransformContext } from "@openbeam/types/services/connectors/panopto";
import type { GenericDocument } from "@openbeam/vespa";
import type { PanoptoFolder } from "../api/folders";
import { buildPanoptoUrl } from "./utils";

export function transformPanoptoFolder(
  folder: PanoptoFolder,
  context: PanoptoTransformContext
): GenericDocument {
  const parts = [
    folder.Description,
    folder.Sessions > 0 ? `Sessions: ${folder.Sessions}` : null,
    folder.ChildFolders > 0 ? `Subfolders: ${folder.ChildFolders}` : null,
    folder.ParentFolderName ? `Parent: ${folder.ParentFolderName}` : null,
    folder.IsPublic ? "Public" : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const url =
    folder.Urls?.FolderUrl ??
    buildPanoptoUrl(
      context.instanceUrl,
      `/Pages/Sessions/List.aspx#folderID="${folder.Id}"`
    );

  return {
    id: `${context.connectorId}_folder_${folder.Id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: folder.Id,
    document_type: "folder",
    title: folder.Name,
    content,
    created_at: Date.now(),
    updated_at: Date.now(),
    url,
    author_name: folder.CreatedBy ?? undefined,
    is_public: folder.IsPublic,
    access_control: [],
    metadata: {
      sessionCount: String(folder.Sessions),
      childFolderCount: String(folder.ChildFolders),
      ...(folder.ParentFolder && { parentFolderId: folder.ParentFolder }),
      ...(folder.ParentFolderName && {
        parentFolderName: folder.ParentFolderName,
      }),
      ...(folder.IsPublic && { isPublic: "true" }),
    },
  };
}
