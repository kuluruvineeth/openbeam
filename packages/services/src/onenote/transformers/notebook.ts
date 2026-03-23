import type { OneNoteTransformContext } from "@openbeam/types/services/connectors/onenote";
import type { GenericDocument } from "@openbeam/vespa";
import type { OneNoteNotebook } from "../api/notebooks";

export function transformOneNoteNotebook(
  notebook: OneNoteNotebook,
  context: OneNoteTransformContext
): GenericDocument {
  const createdAt = new Date(notebook.createdDateTime).getTime();
  const updatedAt = new Date(notebook.lastModifiedDateTime).getTime();
  const authorName = notebook.createdBy.user?.displayName;
  const webUrl = notebook.links?.oneNoteWebUrl?.href;

  return {
    id: `${context.connectorId}_notebook_${notebook.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: notebook.id,
    document_type: "folder",
    document_subtype: "notebook",
    title: notebook.displayName,
    content: `Notebook: ${notebook.displayName}`,
    created_at: createdAt,
    updated_at: updatedAt,
    url: webUrl,
    author_name: authorName,
    is_public: notebook.isShared,
    access_control: [],
    metadata: {
      isDefault: notebook.isDefault,
      isShared: notebook.isShared,
      ...(authorName && { createdBy: authorName }),
    },
  };
}
