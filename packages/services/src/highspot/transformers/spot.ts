import type { HighspotTransformContext } from "@openbeam/types/services/connectors/highspot";
import type { GenericDocument } from "@openbeam/vespa";
import type { HighspotSpot } from "../api/spots";
import { stripHtml } from "./utils";

export function transformHighspotSpot(
  spot: HighspotSpot,
  context: HighspotTransformContext
): GenericDocument {
  const parts = [
    spot.description ? stripHtml(spot.description) : null,
    `Items: ${spot.item_count}`,
    spot.visibility ? `Visibility: ${spot.visibility}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(spot.created_at).getTime();
  const updatedAt = new Date(spot.updated_at).getTime();

  return {
    id: `${context.connectorId}_spot_${spot.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: spot.id,
    document_type: "folder",
    document_subtype: "spot",
    title: spot.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: spot.url ?? `https://${context.domain}/spots/${spot.id}`,
    author_name: spot.owner?.name,
    author_email: spot.owner?.email,
    is_public: false,
    access_control: [],
    metadata: {
      itemCount: String(spot.item_count),
      ...(spot.visibility && { visibility: spot.visibility }),
    },
  };
}
