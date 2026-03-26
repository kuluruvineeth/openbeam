import type { ShowpadTransformContext } from "@openbeam/types/services/connectors/showpad";
import type { GenericDocument } from "@openbeam/vespa";
import type { ShowpadChannel } from "../client";

function buildChannelUrl(subdomain: string, channelId: string): string {
  return `https://${subdomain}.showpad.biz/#!/channel/${channelId}`;
}

export function transformShowpadChannel(
  channel: ShowpadChannel,
  context: ShowpadTransformContext
): GenericDocument {
  const createdAt = new Date(channel.createdAt).getTime();
  const updatedAt = new Date(channel.updatedAt).getTime();

  const contentParts = [channel.name];
  if (channel.description) {
    contentParts.push(channel.description);
  }

  return {
    id: `${context.connectorId}_channel_${channel.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: channel.id,
    document_type: "channel",
    document_subtype: "channel",
    title: channel.name,
    content: contentParts.join(" "),
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildChannelUrl(context.subdomain, channel.id),
    is_public: false,
    access_control: [],
    metadata: {
      ...(channel.assetCount > 0 && { assetCount: channel.assetCount }),
    },
  };
}
