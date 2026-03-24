import type { HighspotTransformContext } from "@openbeam/types/services/connectors/highspot";
import type { GenericDocument } from "@openbeam/vespa";
import type { HighspotPitch } from "../api/pitches";
import { stripHtml } from "./utils";

export function transformHighspotPitch(
  pitch: HighspotPitch,
  context: HighspotTransformContext
): GenericDocument {
  const recipientNames = pitch.recipients
    .map((r) => r.name ?? r.email)
    .join(", ");

  const itemTitles = pitch.items.map((i) => i.title).join(", ");

  const parts = [
    pitch.description ? stripHtml(pitch.description) : null,
    `Status: ${pitch.status}`,
    recipientNames ? `Recipients: ${recipientNames}` : null,
    itemTitles ? `Content: ${itemTitles}` : null,
    pitch.view_count !== null ? `Views: ${pitch.view_count}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(pitch.created_at).getTime();
  const updatedAt = new Date(pitch.updated_at).getTime();

  return {
    id: `${context.connectorId}_pitch_${pitch.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: pitch.id,
    document_type: "document",
    document_subtype: "pitch",
    title: pitch.title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: pitch.url ?? `https://${context.domain}/pitches/${pitch.id}`,
    author_name: pitch.sender?.name,
    author_email: pitch.sender?.email,
    is_public: false,
    access_control: [],
    metadata: {
      status: pitch.status,
      ...(pitch.recipients.length > 0 && {
        recipientCount: String(pitch.recipients.length),
      }),
      ...(pitch.items.length > 0 && {
        itemCount: String(pitch.items.length),
      }),
      ...(pitch.view_count !== null && {
        viewCount: String(pitch.view_count),
      }),
      ...(pitch.opened !== null && { opened: String(pitch.opened) }),
    },
  };
}
