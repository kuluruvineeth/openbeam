import type { SlackClient } from "../client";
import { SlackApiError } from "../types";

interface ReactionsResponse {
  ok: boolean;
  error?: string;
}

export async function addReaction(
  client: SlackClient,
  channel: string,
  timestamp: string,
  name: string
): Promise<boolean> {
  try {
    const result = await client.call<ReactionsResponse>("reactions.add", {
      channel,
      timestamp,
      name,
    });
    return result.ok;
  } catch (error) {
    if (isAlreadyReactedError(error)) {
      return true;
    }
    throw error;
  }
}

export async function removeReaction(
  client: SlackClient,
  channel: string,
  timestamp: string,
  name: string
): Promise<boolean> {
  try {
    const result = await client.call<ReactionsResponse>("reactions.remove", {
      channel,
      timestamp,
      name,
    });
    return result.ok;
  } catch (error) {
    if (isNoReactionError(error)) {
      return true;
    }
    throw error;
  }
}

interface UpdateReactionParams {
  channel: string;
  timestamp: string;
  oldReaction: string;
  newReaction: string;
}

export async function updateReaction(
  client: SlackClient,
  params: UpdateReactionParams
): Promise<boolean> {
  await removeReaction(
    client,
    params.channel,
    params.timestamp,
    params.oldReaction
  );
  return addReaction(
    client,
    params.channel,
    params.timestamp,
    params.newReaction
  );
}

function isAlreadyReactedError(error: unknown): boolean {
  if (error instanceof SlackApiError) {
    return error.code === "already_reacted";
  }
  return error instanceof Error && error.message.includes("already_reacted");
}

function isNoReactionError(error: unknown): boolean {
  if (error instanceof SlackApiError) {
    return error.code === "no_reaction";
  }
  return error instanceof Error && error.message.includes("no_reaction");
}
