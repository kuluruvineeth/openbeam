import type { PanoptoTransformContext } from "@openbeam/types/services/connectors/panopto";
import type { GenericDocument } from "@openbeam/vespa";
import type { PanoptoSession } from "../api/sessions";
import { buildPanoptoUrl, formatDuration } from "./utils";

export function transformPanoptoSession(
  session: PanoptoSession,
  context: PanoptoTransformContext
): GenericDocument {
  const parts = [
    session.Description,
    session.Duration ? `Duration: ${formatDuration(session.Duration)}` : null,
    session.ViewerCount !== null ? `Views: ${session.ViewerCount}` : null,
    session.FolderName ? `Folder: ${session.FolderName}` : null,
    session.State ? `State: ${session.State}` : null,
    session.Tags?.length ? `Tags: ${session.Tags.join(", ")}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(session.CreatedDate).getTime();
  const url =
    session.Urls?.ViewerUrl ??
    buildPanoptoUrl(context.instanceUrl, `/Pages/Viewer.aspx?id=${session.Id}`);

  return {
    id: `${context.connectorId}_session_${session.Id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: session.Id,
    document_type: "session",
    document_subtype: session.IsBroadcast ? "broadcast" : "recording",
    title: session.Name,
    content,
    created_at: createdAt,
    updated_at: createdAt,
    url,
    author_name: session.CreatedBy ?? undefined,
    author_email: session.CreatorEmail ?? undefined,
    is_public: false,
    access_control: [],
    metadata: {
      ...(session.Duration && { duration: String(session.Duration) }),
      ...(session.ViewerCount !== null && {
        viewerCount: String(session.ViewerCount),
      }),
      ...(session.FolderId && { folderId: session.FolderId }),
      ...(session.FolderName && { folderName: session.FolderName }),
      ...(session.State && { state: session.State }),
      ...(session.IsBroadcast && { isBroadcast: "true" }),
      ...(session.Tags?.length && { tags: session.Tags.join(", ") }),
    },
  };
}
