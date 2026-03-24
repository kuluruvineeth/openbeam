import type { HighspotTransformContext } from "@openbeam/types/services/connectors/highspot";
import type { GenericDocument } from "@openbeam/vespa";
import type { HighspotItem } from "../api/items";
import { resolveDocumentType, stripHtml } from "./utils";

export function transformHighspotItem(
  item: HighspotItem,
  context: HighspotTransformContext
): GenericDocument {
  const parts = [
    item.description ? stripHtml(item.description) : null,
    item.type ? `Type: ${item.type}` : null,
    item.spot_name ? `Spot: ${item.spot_name}` : null,
    item.tags.length > 0 ? `Tags: ${item.tags.join(", ")}` : null,
    item.view_count ? `Views: ${item.view_count}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(item.created_at).getTime();
  const updatedAt = new Date(item.updated_at).getTime();
  const documentType = resolveDocumentType(item.type, item.mime_type);

  return {
    id: `${context.connectorId}_item_${item.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: item.id,
    document_type: documentType,
    document_subtype: item.type,
    title: item.title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: item.url ?? `https://${context.domain}/items/${item.id}`,
    author_name: item.author?.name,
    author_email: item.author?.email,
    is_public: false,
    access_control: [],
    metadata: {
      ...(item.type && { itemType: item.type }),
      ...(item.mime_type && { mimeType: item.mime_type }),
      ...(item.spot_id && { spotId: item.spot_id }),
      ...(item.spot_name && { spotName: item.spot_name }),
      ...(item.tags.length > 0 && { tags: item.tags.join(", ") }),
      ...(item.file_size !== null && { fileSize: String(item.file_size) }),
      ...(item.view_count !== null && { viewCount: String(item.view_count) }),
      ...(item.pitch_count !== null && {
        pitchCount: String(item.pitch_count),
      }),
    },
  };
}
