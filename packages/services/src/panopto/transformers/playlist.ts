import type { PanoptoTransformContext } from "@openbeam/types/services/connectors/panopto";
import type { GenericDocument } from "@openbeam/vespa";
import type { PanoptoPlaylist } from "../api/playlists";
import { buildPanoptoUrl } from "./utils";

export function transformPanoptoPlaylist(
  playlist: PanoptoPlaylist,
  context: PanoptoTransformContext
): GenericDocument {
  const parts = [
    playlist.Description,
    playlist.SessionCount > 0 ? `Sessions: ${playlist.SessionCount}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const url =
    playlist.Urls?.ViewerUrl ??
    buildPanoptoUrl(
      context.instanceUrl,
      `/Pages/Viewer.aspx?pid=${playlist.Id}`
    );

  return {
    id: `${context.connectorId}_playlist_${playlist.Id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: playlist.Id,
    document_type: "playlist",
    title: playlist.Name,
    content,
    created_at: Date.now(),
    updated_at: Date.now(),
    url,
    author_name: playlist.CreatedBy ?? undefined,
    is_public: false,
    access_control: [],
    metadata: {
      sessionCount: String(playlist.SessionCount),
      ...(playlist.Sessions?.length && {
        sessionIds: playlist.Sessions.join(", "),
      }),
    },
  };
}
