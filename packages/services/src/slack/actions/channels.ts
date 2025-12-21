import type { SlackClient } from "../client";

interface ChannelResponse {
  ok: boolean;
  channel?: { id: string };
  error?: string;
}

export interface ChannelResult {
  success: boolean;
  channelId?: string;
  error?: string;
}

export interface SetTopicParams {
  channel: string;
  topic: string;
}

export async function setChannelTopic(
  client: SlackClient,
  params: SetTopicParams
): Promise<ChannelResult> {
  const response = await client.call<ChannelResponse>(
    "conversations.setTopic",
    {
      channel: params.channel,
      topic: params.topic,
    }
  );

  if (!response.ok) {
    return { success: false, error: response.error };
  }

  return { success: true, channelId: response.channel?.id };
}

export interface SetPurposeParams {
  channel: string;
  purpose: string;
}

export async function setChannelPurpose(
  client: SlackClient,
  params: SetPurposeParams
): Promise<ChannelResult> {
  const response = await client.call<ChannelResponse>(
    "conversations.setPurpose",
    {
      channel: params.channel,
      purpose: params.purpose,
    }
  );

  if (!response.ok) {
    return { success: false, error: response.error };
  }

  return { success: true, channelId: response.channel?.id };
}

export interface InviteUserParams {
  channel: string;
  users: string[];
}

export async function inviteToChannel(
  client: SlackClient,
  params: InviteUserParams
): Promise<ChannelResult> {
  const response = await client.call<ChannelResponse>("conversations.invite", {
    channel: params.channel,
    users: params.users.join(","),
  });

  if (!response.ok) {
    return { success: false, error: response.error };
  }

  return { success: true, channelId: response.channel?.id };
}

export interface CreateChannelParams {
  name: string;
  isPrivate?: boolean;
}

export async function createChannel(
  client: SlackClient,
  params: CreateChannelParams
): Promise<ChannelResult> {
  const response = await client.call<ChannelResponse>("conversations.create", {
    name: params.name,
    is_private: params.isPrivate ?? false,
  });

  if (!response.ok) {
    return { success: false, error: response.error };
  }

  return { success: true, channelId: response.channel?.id };
}

export async function archiveChannel(
  client: SlackClient,
  channel: string
): Promise<ChannelResult> {
  const response = await client.call<ChannelResponse>("conversations.archive", {
    channel,
  });

  if (!response.ok) {
    return { success: false, error: response.error };
  }

  return { success: true };
}

export async function unarchiveChannel(
  client: SlackClient,
  channel: string
): Promise<ChannelResult> {
  const response = await client.call<ChannelResponse>(
    "conversations.unarchive",
    { channel }
  );

  if (!response.ok) {
    return { success: false, error: response.error };
  }

  return { success: true };
}
