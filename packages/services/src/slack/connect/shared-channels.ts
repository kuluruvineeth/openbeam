import type { SlackChannel } from "@openplane/types/services/connectors/slack";
import type { SlackClient } from "../client";
import type {
  ConnectedTeam,
  ConnectPermission,
  ConnectSyncConfig,
  ConnectSyncResult,
  ExternalUser,
  SharedChannel,
  SharedChannelType,
} from "./types";
import { DEFAULT_CONNECT_CONFIG } from "./types";

interface ConversationsInfoResponse {
  ok: boolean;
  channel?: {
    id: string;
    name?: string;
    is_shared?: boolean;
    is_ext_shared?: boolean;
    is_org_shared?: boolean;
    is_pending_ext_shared?: boolean;
    connected_team_ids?: string[];
    internal_team_ids?: string[];
    shared_team_ids?: string[];
    pending_connected_team_ids?: string[];
  };
  error?: string;
}

interface TeamInfoResponse {
  ok: boolean;
  team?: {
    id: string;
    name: string;
    domain?: string;
    icon?: {
      image_original?: string;
    };
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

interface UsersInfoResponse {
  ok: boolean;
  user?: {
    id: string;
    team_id?: string;
    name?: string;
    real_name?: string;
    profile?: {
      email?: string;
      display_name?: string;
    };
    is_restricted?: boolean;
    is_ultra_restricted?: boolean;
  };
  error?: string;
}

export async function isSharedChannel(
  client: SlackClient,
  channelId: string
): Promise<boolean> {
  const info = await getSharedChannelInfo(client, channelId);
  return info?.isExternal ?? false;
}

export async function getSharedChannelInfo(
  client: SlackClient,
  channelId: string
): Promise<SharedChannel | null> {
  const response = await client.call<ConversationsInfoResponse>(
    "conversations.info",
    {
      channel: channelId,
      include_num_members: true,
    }
  );

  if (!(response.ok && response.channel)) {
    return null;
  }

  const channel = response.channel;
  const isExternal =
    channel.is_ext_shared === true || channel.is_org_shared === true;

  const connectedTeamIds = [
    ...(channel.connected_team_ids ?? []),
    ...(channel.shared_team_ids ?? []),
  ];

  const uniqueTeamIds = [...new Set(connectedTeamIds)];
  const connectedTeams = await resolveTeams(client, uniqueTeamIds);

  return {
    id: channel.id,
    name: channel.name ?? channelId,
    type: determineChannelType(channel),
    isExternal,
    connectedTeams,
    isArchived: false,
  };
}

export async function listSharedChannels(
  client: SlackClient,
  channels: SlackChannel[]
): Promise<SharedChannel[]> {
  const sharedChannels: SharedChannel[] = [];

  for (const channel of channels) {
    if (channel.is_shared || channel.is_ext_shared || channel.is_org_shared) {
      const info = await getSharedChannelInfo(client, channel.id);
      if (info) {
        sharedChannels.push(info);
      }
    }
  }

  return sharedChannels;
}

export async function getExternalUsersInChannel(
  client: SlackClient,
  channelId: string,
  ownTeamId: string
): Promise<ExternalUser[]> {
  const externalUsers: ExternalUser[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.call<ConversationsMembersResponse>(
      "conversations.members",
      {
        channel: channelId,
        limit: 200,
        cursor,
      }
    );

    if (!(response.ok && response.members)) {
      break;
    }

    for (const memberId of response.members) {
      const userInfo = await getUserInfo(client, memberId);

      if (userInfo && userInfo.teamId !== ownTeamId) {
        externalUsers.push({
          id: userInfo.id,
          teamId: userInfo.teamId ?? "",
          displayName: userInfo.displayName,
          email: userInfo.email,
          isExternal: true,
          isRestricted: userInfo.isRestricted ?? false,
          isUltraRestricted: userInfo.isUltraRestricted ?? false,
        });
      }
    }

    cursor = response.response_metadata?.next_cursor;
  } while (cursor);

  return externalUsers;
}

export function shouldSyncSharedChannel(
  channel: SharedChannel,
  config: ConnectSyncConfig = DEFAULT_CONNECT_CONFIG
): ConnectPermission {
  if (!config.syncExternalChannels && channel.isExternal) {
    return {
      canIndexExternal: false,
      canIndexExternalContent: false,
      reason: "External channel sync disabled",
    };
  }

  const externalTeamIds = channel.connectedTeams.map((t) => t.id);

  if (config.blockedExternalTeams.length > 0) {
    const blocked = externalTeamIds.some((id) =>
      config.blockedExternalTeams.includes(id)
    );
    if (blocked) {
      return {
        canIndexExternal: false,
        canIndexExternalContent: false,
        reason: "Connected team is blocked",
      };
    }
  }

  if (config.allowedExternalTeams.length > 0) {
    const allowed = externalTeamIds.every((id) =>
      config.allowedExternalTeams.includes(id)
    );
    if (!allowed) {
      return {
        canIndexExternal: false,
        canIndexExternalContent: false,
        reason: "Connected team not in allowlist",
      };
    }
  }

  return {
    canIndexExternal: true,
    canIndexExternalContent: config.indexExternalContent,
  };
}

export function filterExternalMessages<T extends { user?: string }>(
  messages: T[],
  externalUserIds: Set<string>,
  _config: ConnectSyncConfig
): { internal: T[]; external: T[] } {
  const internal: T[] = [];
  const external: T[] = [];

  for (const message of messages) {
    if (message.user && externalUserIds.has(message.user)) {
      external.push(message);
    } else {
      internal.push(message);
    }
  }

  return { internal, external };
}

export async function syncSharedChannel(
  client: SlackClient,
  channel: SharedChannel,
  ownTeamId: string,
  config: ConnectSyncConfig = DEFAULT_CONNECT_CONFIG
): Promise<ConnectSyncResult> {
  const permission = shouldSyncSharedChannel(channel, config);
  const errors: string[] = [];
  const messagesIndexed = 0;
  const externalMessagesIndexed = 0;
  let externalUsersFound = 0;
  const skippedMessages = 0;

  if (!permission.canIndexExternal) {
    return {
      channelId: channel.id,
      channelName: channel.name,
      sharedWith: channel.connectedTeams,
      messagesIndexed: 0,
      externalMessagesIndexed: 0,
      externalUsersFound: 0,
      skippedMessages: 0,
      errors: [permission.reason ?? "External indexing not permitted"],
    };
  }

  try {
    const externalUsers = await getExternalUsersInChannel(
      client,
      channel.id,
      ownTeamId
    );
    externalUsersFound = externalUsers.length;
  } catch (error) {
    errors.push(
      `Failed to get external users: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return {
    channelId: channel.id,
    channelName: channel.name,
    sharedWith: channel.connectedTeams,
    messagesIndexed,
    externalMessagesIndexed,
    externalUsersFound,
    skippedMessages,
    errors,
  };
}

async function resolveTeams(
  client: SlackClient,
  teamIds: string[]
): Promise<ConnectedTeam[]> {
  const teams: ConnectedTeam[] = [];

  for (const teamId of teamIds) {
    try {
      const response = await client.call<TeamInfoResponse>("team.info", {
        team: teamId,
      });

      if (response.ok && response.team) {
        teams.push({
          id: response.team.id,
          name: response.team.name,
          domain: response.team.domain,
          icon: response.team.icon?.image_original,
          isVerified: false,
        });
      }
    } catch {
      teams.push({
        id: teamId,
        name: `Team ${teamId}`,
        isVerified: false,
      });
    }
  }

  return teams;
}

async function getUserInfo(
  client: SlackClient,
  userId: string
): Promise<{
  id: string;
  teamId?: string;
  displayName?: string;
  email?: string;
  isRestricted?: boolean;
  isUltraRestricted?: boolean;
} | null> {
  try {
    const response = await client.call<UsersInfoResponse>("users.info", {
      user: userId,
    });

    if (!(response.ok && response.user)) {
      return null;
    }

    return {
      id: response.user.id,
      teamId: response.user.team_id,
      displayName:
        response.user.profile?.display_name ?? response.user.real_name,
      email: response.user.profile?.email,
      isRestricted: response.user.is_restricted,
      isUltraRestricted: response.user.is_ultra_restricted,
    };
  } catch {
    return null;
  }
}

function determineChannelType(channel: {
  is_ext_shared?: boolean;
  is_org_shared?: boolean;
  is_shared?: boolean;
}): SharedChannelType {
  if (channel.is_ext_shared) {
    return "external_shared";
  }
  if (channel.is_org_shared) {
    return "org_shared";
  }
  if (channel.is_shared) {
    return "external_limited";
  }
  return "internal";
}
