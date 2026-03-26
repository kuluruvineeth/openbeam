import type { SeismicTransformContext } from "@openbeam/types/services/connectors/seismic";
import type { GenericDocument } from "@openbeam/vespa";
import type { SeismicContent } from "../api/contents";

export function transformSeismicContent(
  content: SeismicContent,
  context: SeismicTransformContext
): GenericDocument {
  const parts = [
    content.description,
    content.type ? `Type: ${content.type}` : null,
    content.format ? `Format: ${content.format}` : null,
    content.teamsiteName ? `Workspace: ${content.teamsiteName}` : null,
    content.tags?.length ? `Tags: ${content.tags.join(", ")}` : null,
  ].filter(Boolean);

  const body = parts.join(" — ");
  const createdAt = new Date(content.createdAt).getTime();
  const updatedAt = new Date(content.modifiedAt).getTime();

  return {
    id: `${context.connectorId}_content_${content.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: content.id,
    document_type: "content",
    document_subtype: content.type,
    title: content.name,
    content: body,
    created_at: createdAt,
    updated_at: updatedAt,
    url: content.url ?? "",
    author_name: content.createdBy,
    is_public: false,
    access_control: [],
    metadata: {
      ...(content.type && { contentType: content.type }),
      ...(content.format && { format: content.format }),
      ...(content.teamsiteId && { workspaceId: content.teamsiteId }),
      ...(content.teamsiteName && { workspaceName: content.teamsiteName }),
      ...(content.version && { version: String(content.version) }),
      ...(content.size && { size: String(content.size) }),
      ...(content.tags?.length && { tags: content.tags.join(", ") }),
    },
  };
}
