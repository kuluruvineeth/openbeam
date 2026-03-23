import type { DocuSignTransformContext } from "@openbeam/types/services/connectors/docusign";
import type { GenericDocument } from "@openbeam/vespa";
import type { DocuSignFolder } from "../api/folders";
import { buildDocuSignUrl } from "./utils";

export function transformDocuSignFolder(
  folder: DocuSignFolder,
  context: DocuSignTransformContext
): GenericDocument {
  const parts = [
    `Type: ${folder.type}`,
    folder.itemCount ? `Items: ${folder.itemCount}` : null,
    folder.subFolderCount ? `Subfolders: ${folder.subFolderCount}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const now = Date.now();

  return {
    id: `${context.connectorId}_folder_${folder.folderId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: folder.folderId,
    document_type: "folder",
    document_subtype: folder.type,
    title: folder.name,
    content,
    created_at: now,
    updated_at: now,
    url: buildDocuSignUrl(
      context.accountBaseUri,
      context.accountId,
      "folder",
      folder.folderId
    ),
    author_name: folder.ownerUserName,
    author_email: folder.ownerEmail,
    is_public: false,
    access_control: [],
    metadata: {
      folderType: folder.type,
      ...(folder.itemCount && { itemCount: folder.itemCount }),
      ...(folder.subFolderCount && {
        subFolderCount: folder.subFolderCount,
      }),
      ...(folder.parentFolderId && {
        parentFolderId: folder.parentFolderId,
      }),
    },
  };
}
