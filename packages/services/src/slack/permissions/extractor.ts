import type { Database } from "@openbeam/db";
import { upsertGroupMembership } from "@openbeam/db";

export interface SlackPermissionContext {
  connectorId: string;
  teamId: string;
  workspaceId: string;
}

export interface ChannelPermission {
  channelId: string;
  channelName: string;
  isPrivate: boolean;
  memberUserIds: string[];
}

export interface SlackPermissionResult {
  groupsWritten: number;
}

export async function extractSlackPermissions(
  db: Database,
  ctx: SlackPermissionContext,
  channels: ChannelPermission[]
): Promise<SlackPermissionResult> {
  let groupsWritten = 0;

  for (const channel of channels) {
    if (!channel.isPrivate) {
      continue;
    }

    for (const userId of channel.memberUserIds) {
      await upsertGroupMembership(db, {
        teamId: ctx.teamId,
        userId,
        groupId: channel.channelId,
        groupType: "CHANNEL",
        source: `slack:${ctx.connectorId}`,
        externalGroupId: channel.channelId,
      });
      groupsWritten += 1;
    }
  }

  return { groupsWritten };
}

export function buildSlackDocumentAcl(
  channel: ChannelPermission,
  teamId: string
): { accessControl: string[]; isPublic: boolean } {
  if (!channel.isPrivate) {
    return { accessControl: [], isPublic: true };
  }

  return {
    accessControl: [
      `team:${teamId}`,
      `channel:${channel.channelId}`,
      ...channel.memberUserIds.map((id) => `user:${id}`),
    ],
    isPublic: false,
  };
}
