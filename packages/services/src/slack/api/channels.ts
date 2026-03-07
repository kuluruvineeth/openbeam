import {
  type SlackChannel,
  SlackChannelSchema,
} from "@openbeam/types/services/connectors/slack";
import type { SlackClient } from "../client";

export interface ListChannelsOptions {
  types?: Array<"public_channel" | "private_channel" | "im" | "mpim">;
  excludeArchived?: boolean;
  limit?: number;
  memberOnly?: boolean;
}

export interface GetMembersOptions {
  limit?: number;
}

interface ConversationsListResponse {
  ok: boolean;
  channels?: unknown[];
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
}

interface ConversationsMembersResponse {
  ok: boolean;
  members?: string[];
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
}

interface ConversationsInfoResponse {
  ok: boolean;
  channel?: unknown;
  error?: string;
}

export async function* listChannels(
  client: SlackClient,
  options: ListChannelsOptions = {}
): AsyncGenerator<SlackChannel, void, undefined> {
  const {
    types = ["public_channel", "private_channel"],
    excludeArchived = true,
    limit = 200,
    memberOnly = false,
  } = options;

  let cursor: string | undefined;

  do {
    const response = await client.call<ConversationsListResponse>(
      "conversations.list",
      {
        types: types.join(","),
        exclude_archived: excludeArchived,
        limit: Math.min(limit, 1000),
        cursor,
      }
    );

    const channels = response.channels ?? [];

    for (const rawChannel of channels) {
      const parsed = SlackChannelSchema.safeParse(rawChannel);

      if (!parsed.success) {
        continue;
      }

      const channel = parsed.data;

      if (memberOnly && !channel.is_member) {
        continue;
      }

      yield channel;
    }

    cursor = response.response_metadata?.next_cursor || undefined;
  } while (cursor);
}

export async function getAllChannels(
  client: SlackClient,
  options: ListChannelsOptions = {}
): Promise<SlackChannel[]> {
  const channels: SlackChannel[] = [];

  for await (const channel of listChannels(client, options)) {
    channels.push(channel);
  }

  return channels;
}

export function getAccessibleChannels(
  client: SlackClient,
  options: Omit<ListChannelsOptions, "memberOnly"> = {}
): Promise<SlackChannel[]> {
  return getAllChannels(client, { ...options, memberOnly: false });
}

export async function getChannelInfo(
  client: SlackClient,
  channelId: string
): Promise<SlackChannel | null> {
  const response = await client.call<ConversationsInfoResponse>(
    "conversations.info",
    {
      channel: channelId,
    }
  );

  if (!response.channel) {
    return null;
  }

  const parsed = SlackChannelSchema.safeParse(response.channel);
  return parsed.success ? parsed.data : null;
}

export async function* getChannelMembers(
  client: SlackClient,
  channelId: string,
  options: GetMembersOptions = {}
): AsyncGenerator<string, void, undefined> {
  const { limit = 200 } = options;

  let cursor: string | undefined;

  do {
    const response = await client.call<ConversationsMembersResponse>(
      "conversations.members",
      {
        channel: channelId,
        limit: Math.min(limit, 1000),
        cursor,
      }
    );

    const members = response.members ?? [];

    for (const memberId of members) {
      yield memberId;
    }

    cursor = response.response_metadata?.next_cursor || undefined;
  } while (cursor);
}

export async function getAllChannelMembers(
  client: SlackClient,
  channelId: string,
  options: GetMembersOptions = {}
): Promise<string[]> {
  const members: string[] = [];

  for await (const memberId of getChannelMembers(client, channelId, options)) {
    members.push(memberId);
  }

  return members;
}

export async function buildChannelMemberMap(
  client: SlackClient,
  channels: SlackChannel[]
): Promise<Map<string, string[]>> {
  const memberMap = new Map<string, string[]>();

  for (const channel of channels) {
    if (!channel.is_private) {
      continue;
    }

    const members = await getAllChannelMembers(client, channel.id);
    memberMap.set(channel.id, members);
  }

  return memberMap;
}

export function filterChannelsByType(
  channels: SlackChannel[],
  types: Array<"public" | "private" | "im" | "mpim">
): SlackChannel[] {
  return channels.filter((channel) => {
    if (types.includes("public") && !channel.is_private && channel.is_channel) {
      return true;
    }
    if (types.includes("private") && channel.is_private && channel.is_group) {
      return true;
    }
    if (types.includes("im") && channel.is_im) {
      return true;
    }
    if (types.includes("mpim") && channel.is_mpim) {
      return true;
    }
    return false;
  });
}

export function isBotMember(channel: SlackChannel): boolean {
  return channel.is_member === true;
}
