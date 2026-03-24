import type { BynderTransformContext } from "@openbeam/types/services/connectors/bynder";
import type { GenericDocument } from "@openbeam/vespa";
import type { BynderTag } from "../client";

export function transformBynderTag(
  tag: BynderTag,
  context: BynderTransformContext
): GenericDocument {
  const now = Date.now();

  return {
    id: `${context.connectorId}_tag_${tag.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: tag.id,
    document_type: "tag",
    document_subtype: "tag",
    title: tag.tag,
    content: tag.tag,
    created_at: now,
    updated_at: now,
    url: `https://${context.domain}.bynder.com/media/?tags=${encodeURIComponent(tag.tag)}`,
    is_public: false,
    access_control: [],
    metadata: {
      ...(tag.mediaCount > 0 && { mediaCount: tag.mediaCount }),
    },
  };
}
