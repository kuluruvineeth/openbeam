import type { Entity, JsonObject } from "@openplane/vespa";
import type { SlackChannel, TransformContext } from "../types";

export interface ChannelTransformContext extends TransformContext {
  members?: string[];
}

export function transformChannel(
  channel: SlackChannel,
  context: ChannelTransformContext
): Entity {
  const { connectorId, teamId } = context;

  const entityId = `${connectorId}_channel_${channel.id}`;
  const now = Date.now();

  return {
    id: entityId,
    entity_type: getChannelEntityType(channel),
    connector_id: connectorId,
    team_id: teamId,
    external_id: channel.id,
    name: channel.name,
    metadata: buildChannelMetadata(channel, context.members),
    created_at: channel.created ? channel.created * 1000 : now,
    updated_at: now,
    is_active: !channel.is_archived,
  };
}

export function transformChannels(
  channels: SlackChannel[],
  context: TransformContext,
  memberMap?: Map<string, string[]>
): Entity[] {
  return channels.map((channel) =>
    transformChannel(channel, {
      ...context,
      members: memberMap?.get(channel.id),
    })
  );
}

function getChannelEntityType(channel: SlackChannel): string {
  if (channel.is_im) {
    return "direct_message";
  }
  if (channel.is_mpim) {
    return "group_dm";
  }
  if (channel.is_private) {
    return "private_channel";
  }
  return "channel";
}

function buildChannelMetadata(
  channel: SlackChannel,
  members?: string[]
): JsonObject {
  const metadata: JsonObject = {
    is_private: channel.is_private,
    is_archived: channel.is_archived ?? false,
    is_general: channel.is_general ?? false,
    is_shared: channel.is_shared ?? false,
    is_ext_shared: channel.is_ext_shared ?? false,
    is_org_shared: channel.is_org_shared ?? false,
    is_member: channel.is_member ?? false,
  };

  if (channel.creator) {
    metadata.creator = channel.creator;
  }

  if (channel.topic?.value) {
    metadata.topic = channel.topic.value;
  }

  if (channel.purpose?.value) {
    metadata.purpose = channel.purpose.value;
  }

  if (channel.num_members !== undefined) {
    metadata.num_members = channel.num_members;
  } else if (members) {
    metadata.num_members = members.length;
  }

  return metadata;
}

export function getChannelDisplayName(channel: SlackChannel): string {
  if (channel.is_im) {
    return "Direct Message";
  }
  if (channel.is_mpim) {
    return `Group DM: ${channel.name}`;
  }
  return `#${channel.name}`;
}

export function getChannelType(
  channel: SlackChannel
): "public" | "private" | "im" | "mpim" {
  if (channel.is_im) {
    return "im";
  }
  if (channel.is_mpim) {
    return "mpim";
  }
  if (channel.is_private) {
    return "private";
  }
  return "public";
}

export function isAccessible(channel: SlackChannel): boolean {
  return channel.is_member === true;
}

export function shouldIndex(
  channel: SlackChannel,
  settings: {
    indexPrivate?: boolean;
    indexDms?: boolean;
    indexGroupDms?: boolean;
  }
): boolean {
  if (!(channel.is_private || channel.is_im || channel.is_mpim)) {
    return true;
  }

  if (channel.is_private && !channel.is_im && !channel.is_mpim) {
    return settings.indexPrivate ?? false;
  }

  if (channel.is_im) {
    return settings.indexDms ?? false;
  }

  if (channel.is_mpim) {
    return settings.indexGroupDms ?? false;
  }

  return false;
}
