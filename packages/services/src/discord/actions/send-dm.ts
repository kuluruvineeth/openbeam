import type { DiscordClient, DiscordMessagePayload } from "../client";

export interface SendDmResult {
  success: boolean;
  error?: string;
}

export async function sendDm(
  client: DiscordClient,
  userId: string,
  payload: DiscordMessagePayload
): Promise<SendDmResult> {
  const sent = await client.sendDm(userId, payload);
  if (!sent) {
    return { success: false, error: "Failed to send DM" };
  }
  return { success: true };
}

export async function sendDmToMultiple(
  client: DiscordClient,
  userIds: string[],
  payload: DiscordMessagePayload
): Promise<Map<string, SendDmResult>> {
  const results = new Map<string, SendDmResult>();
  for (const userId of userIds) {
    const result = await sendDm(client, userId, payload);
    results.set(userId, result);
  }
  return results;
}
