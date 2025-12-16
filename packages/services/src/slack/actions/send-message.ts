import type { KnownBlock } from "@slack/web-api";
import type { SlackClient } from "../client";

interface ChatPostMessageResponse {
  ok: boolean;
  ts?: string;
  channel?: string;
  message?: {
    ts: string;
    text?: string;
  };
  error?: string;
}

export interface SendMessageParams {
  channel: string;
  text: string;
  blocks?: KnownBlock[];
  threadTs?: string;
  unfurlLinks?: boolean;
  unfurlMedia?: boolean;
  mrkdwn?: boolean;
}

export interface SendMessageResult {
  success: boolean;
  messageTs?: string;
  channelId?: string;
  error?: string;
}

export async function sendMessage(
  client: SlackClient,
  params: SendMessageParams
): Promise<SendMessageResult> {
  try {
    const response = await client.call<ChatPostMessageResponse>(
      "chat.postMessage",
      {
        channel: params.channel,
        text: params.text,
        blocks: params.blocks,
        thread_ts: params.threadTs,
        unfurl_links: params.unfurlLinks ?? false,
        unfurl_media: params.unfurlMedia ?? true,
        mrkdwn: params.mrkdwn ?? true,
      }
    );

    if (!response.ok) {
      return { success: false, error: response.error };
    }

    return {
      success: true,
      messageTs: response.ts ?? response.message?.ts,
      channelId: response.channel,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendEphemeralMessage(
  client: SlackClient,
  params: SendMessageParams & { userId: string }
): Promise<SendMessageResult> {
  try {
    const response = await client.call<ChatPostMessageResponse>(
      "chat.postEphemeral",
      {
        channel: params.channel,
        user: params.userId,
        text: params.text,
        blocks: params.blocks,
        thread_ts: params.threadTs,
      }
    );

    if (!response.ok) {
      return { success: false, error: response.error };
    }

    return {
      success: true,
      messageTs: response.ts,
      channelId: response.channel,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateMessage(
  client: SlackClient,
  params: {
    channel: string;
    ts: string;
    text?: string;
    blocks?: KnownBlock[];
  }
): Promise<SendMessageResult> {
  try {
    const response = await client.call<ChatPostMessageResponse>("chat.update", {
      channel: params.channel,
      ts: params.ts,
      text: params.text,
      blocks: params.blocks,
    });

    if (!response.ok) {
      return { success: false, error: response.error };
    }

    return {
      success: true,
      messageTs: response.ts,
      channelId: response.channel,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
