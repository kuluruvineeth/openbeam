import type { GoogleChatTransformContext } from "@openbeam/types/services/connectors/google-chat";
import type { GenericDocument } from "@openbeam/vespa";
import type { ChatSpace } from "../client";

function extractSpaceId(name: string): string {
  return name.replace("spaces/", "");
}

export function transformSpace(
  space: ChatSpace,
  context: GoogleChatTransformContext,
  memberCount?: number
): GenericDocument {
  const spaceId = extractSpaceId(space.name);
  const content = [
    space.displayName,
    space.spaceDetails?.description,
    space.spaceDetails?.guidelines,
  ]
    .filter(Boolean)
    .join(" — ");

  const createdAt = space.createTime
    ? new Date(space.createTime).getTime()
    : Date.now();

  return {
    id: `${context.connectorId}_space_${spaceId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: spaceId,
    document_type: "space",
    document_subtype: "chat_space",
    title: space.displayName || spaceId,
    content,
    created_at: createdAt,
    updated_at: createdAt,
    url: `https://chat.google.com/room/${spaceId}`,
    is_public: space.externalUserAllowed ?? false,
    metadata: {
      spaceType: space.type,
      ...(space.threaded && { threaded: true }),
      ...(memberCount !== undefined && { memberCount }),
    },
  };
}
