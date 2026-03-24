import type { EvernoteTransformContext } from "@openbeam/types/services/connectors/evernote";
import type { GenericDocument } from "@openbeam/vespa";
import type { EvernoteTag } from "../api/tags";

export function transformTag(
  tag: EvernoteTag,
  context: EvernoteTransformContext,
  tagMap: Map<string, EvernoteTag>
): GenericDocument {
  const parts: string[] = [];

  if (tag.parentGuid) {
    const parent = tagMap.get(tag.parentGuid);
    if (parent) {
      parts.push(`Parent tag: ${parent.name}`);
    }
  }

  const content = parts.join(" — ");

  return {
    id: `${context.connectorId}_tag_${tag.guid}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: tag.guid,
    document_type: "tag",
    title: tag.name,
    content,
    created_at: Date.now(),
    updated_at: Date.now(),
    url: `https://www.evernote.com/client/web#?t=${tag.guid}`,
    is_public: false,
    access_control: [],
    metadata: {
      ...(tag.parentGuid && { parentGuid: tag.parentGuid }),
    },
  };
}
