import type { KnownBlock } from "@slack/web-api";
import type { SlackClient } from "../client";
import { type SendMessageResult, sendMessage } from "./send-message";

interface ConversationsOpenResponse {
  ok: boolean;
  channel?: {
    id: string;
  };
  error?: string;
}

export interface SendDMParams {
  userId: string;
  text: string;
  blocks?: KnownBlock[];
}

export async function sendDM(
  client: SlackClient,
  params: SendDMParams
): Promise<SendMessageResult> {
  try {
    const openResponse = await client.call<ConversationsOpenResponse>(
      "conversations.open",
      { users: params.userId }
    );

    if (!(openResponse.ok && openResponse.channel)) {
      return {
        success: false,
        error: openResponse.error ?? "Failed to open DM channel",
      };
    }

    return sendMessage(client, {
      channel: openResponse.channel.id,
      text: params.text,
      blocks: params.blocks,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendDMToMultiple(
  client: SlackClient,
  userIds: string[],
  params: Omit<SendDMParams, "userId">
): Promise<Map<string, SendMessageResult>> {
  const results = new Map<string, SendMessageResult>();

  for (const userId of userIds) {
    const result = await sendDM(client, { ...params, userId });
    results.set(userId, result);
  }

  return results;
}
