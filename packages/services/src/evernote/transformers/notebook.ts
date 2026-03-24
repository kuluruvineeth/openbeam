import type { EvernoteTransformContext } from "@openbeam/types/services/connectors/evernote";
import type { GenericDocument } from "@openbeam/vespa";
import type { EvernoteNotebook } from "../api/notebooks";

export function transformNotebook(
  notebook: EvernoteNotebook,
  context: EvernoteTransformContext
): GenericDocument {
  const parts: string[] = [];
  if (notebook.stack) {
    parts.push(`Stack: ${notebook.stack}`);
  }
  if (notebook.defaultNotebook) {
    parts.push("Default notebook");
  }

  const content = parts.join(" — ");

  return {
    id: `${context.connectorId}_notebook_${notebook.guid}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: notebook.guid,
    document_type: "folder",
    title: notebook.name,
    content,
    created_at: notebook.serviceCreated,
    updated_at: notebook.serviceUpdated,
    url: `https://www.evernote.com/client/web#?b=${notebook.guid}`,
    is_public: false,
    access_control: [],
    metadata: {
      ...(notebook.stack && { stack: notebook.stack }),
      ...(notebook.defaultNotebook && { isDefault: "true" }),
    },
  };
}
