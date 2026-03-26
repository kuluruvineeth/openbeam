import type { ShowpadTransformContext } from "@openbeam/types/services/connectors/showpad";
import type { GenericDocument } from "@openbeam/vespa";
import type { ShowpadTag } from "../client";

export function transformShowpadTag(
  tag: ShowpadTag,
  context: ShowpadTransformContext
): GenericDocument {
  const now = Date.now();

  return {
    id: `${context.connectorId}_tag_${tag.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: tag.id,
    document_type: "unknown",
    document_subtype: "tag",
    title: tag.name,
    content: tag.name,
    created_at: now,
    updated_at: now,
    url: `https://${context.subdomain}.showpad.biz/#!/search?tags=${encodeURIComponent(tag.name)}`,
    is_public: false,
    access_control: [],
    metadata: {},
  };
}
