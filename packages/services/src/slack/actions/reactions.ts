import type { SlackClient } from "../client";

interface ReactionResponse {
  ok: boolean;
  error?: string;
}

export interface ReactionParams {
  channel: string;
  timestamp: string;
  emoji: string;
}

export interface ReactionResult {
  success: boolean;
  error?: string;
}

export async function addReaction(
  client: SlackClient,
  params: ReactionParams
): Promise<ReactionResult> {
  const response = await client.call<ReactionResponse>("reactions.add", {
    channel: params.channel,
    timestamp: params.timestamp,
    name: params.emoji.replace(/:/g, ""),
  });

  if (!response.ok) {
    return { success: false, error: response.error };
  }

  return { success: true };
}

export async function removeReaction(
  client: SlackClient,
  params: ReactionParams
): Promise<ReactionResult> {
  const response = await client.call<ReactionResponse>("reactions.remove", {
    channel: params.channel,
    timestamp: params.timestamp,
    name: params.emoji.replace(/:/g, ""),
  });

  if (!response.ok) {
    return { success: false, error: response.error };
  }

  return { success: true };
}
