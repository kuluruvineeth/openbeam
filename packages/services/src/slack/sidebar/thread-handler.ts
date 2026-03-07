import { cacheSidebarContext, getSidebarContextKey } from "@openbeam/redis";
import type { SlackClient } from "../client";
import type {
  AssistantThreadContextChangedEvent,
  AssistantThreadStartedEvent,
} from "../events/types";
import {
  setSuggestedPrompts,
  setThreadStatus,
  setThreadTitle,
} from "./handler";
import { getContextualPrompts } from "./prompts";
import type { SidebarContext, ThreadContext } from "./types";

export type { AssistantThreadContextChangedEvent, AssistantThreadStartedEvent };

interface ConversationsInfoResponse {
  ok: boolean;
  channel?: {
    name?: string;
    is_private?: boolean;
    is_im?: boolean;
    is_mpim?: boolean;
  };
  error?: string;
}

function determineChannelType(
  channel?: ConversationsInfoResponse["channel"]
): SidebarContext["channelType"] {
  if (!channel) {
    return "channel";
  }
  if (channel.is_im) {
    return "im";
  }
  if (channel.is_mpim) {
    return "mpim";
  }
  if (channel.is_private) {
    return "group";
  }
  return "channel";
}

async function getChannelInfo(
  client: SlackClient,
  channelId: string
): Promise<{
  name?: string;
  channelType: SidebarContext["channelType"];
}> {
  try {
    const result = await client.call<ConversationsInfoResponse>(
      "conversations.info",
      { channel: channelId }
    );
    if (result.ok && result.channel) {
      return {
        name: result.channel.name,
        channelType: determineChannelType(result.channel),
      };
    }
    return { channelType: "channel" };
  } catch {
    return { channelType: "channel" };
  }
}

export async function handleAssistantThreadStarted(
  client: SlackClient,
  event: AssistantThreadStartedEvent,
  connectorId: string,
  teamId: string
): Promise<void> {
  const { assistant_thread } = event;
  const contextChannelId =
    assistant_thread.context.channel_id ?? assistant_thread.channel_id;
  const contextTeamId = assistant_thread.context.team_id ?? teamId;

  const threadContext: ThreadContext = {
    channelId: assistant_thread.channel_id,
    threadTs: assistant_thread.thread_ts,
    userId: assistant_thread.user_id,
  };

  const cacheKey = getSidebarContextKey(
    assistant_thread.channel_id,
    assistant_thread.thread_ts
  );

  await cacheSidebarContext(cacheKey, {
    channelId: assistant_thread.channel_id,
    threadTs: assistant_thread.thread_ts,
    userId: assistant_thread.user_id,
    contextChannelId,
    contextTeamId,
    connectorId,
    teamId,
  });

  await setThreadStatus(client, threadContext, "Thinking...");

  const channelInfo = await getChannelInfo(client, contextChannelId);

  const sidebarContext: SidebarContext = {
    channelId: contextChannelId,
    channelName: channelInfo.name,
    channelType: channelInfo.channelType,
    teamId: contextTeamId,
    userId: assistant_thread.user_id,
    threadTs: assistant_thread.thread_ts,
  };

  const prompts = getContextualPrompts(sidebarContext);
  await setSuggestedPrompts(client, threadContext, prompts);

  await setThreadStatus(client, threadContext, "");

  const title = channelInfo.name ? `#${channelInfo.name}` : "OpenBeam";
  await setThreadTitle(client, threadContext, title);
}

export async function handleAssistantContextChanged(
  client: SlackClient,
  event: AssistantThreadContextChangedEvent,
  connectorId: string,
  teamId: string
): Promise<void> {
  const { assistant_thread } = event;
  const contextChannelId =
    assistant_thread.context.channel_id ?? assistant_thread.channel_id;
  const contextTeamId = assistant_thread.context.team_id ?? teamId;

  const threadContext: ThreadContext = {
    channelId: assistant_thread.channel_id,
    threadTs: assistant_thread.thread_ts,
    userId: assistant_thread.user_id,
  };

  const cacheKey = getSidebarContextKey(
    assistant_thread.channel_id,
    assistant_thread.thread_ts
  );

  await cacheSidebarContext(cacheKey, {
    channelId: assistant_thread.channel_id,
    threadTs: assistant_thread.thread_ts,
    userId: assistant_thread.user_id,
    contextChannelId,
    contextTeamId,
    connectorId,
    teamId,
  });

  const channelInfo = await getChannelInfo(client, contextChannelId);

  const sidebarContext: SidebarContext = {
    channelId: contextChannelId,
    channelName: channelInfo.name,
    channelType: channelInfo.channelType,
    teamId: contextTeamId,
    userId: assistant_thread.user_id,
    threadTs: assistant_thread.thread_ts,
  };

  const prompts = getContextualPrompts(sidebarContext);
  await setSuggestedPrompts(client, threadContext, prompts);

  const title = channelInfo.name ? `#${channelInfo.name}` : "OpenBeam";
  await setThreadTitle(client, threadContext, title);
}
