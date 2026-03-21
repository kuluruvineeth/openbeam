import type { MicrosoftGraphClient } from "../../microsoft/client";

export interface TeamsMessageActionResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendTeamsMessage(
  client: MicrosoftGraphClient,
  options: { teamId: string; channelId: string; content: string }
): Promise<TeamsMessageActionResult> {
  try {
    const result = await client.get<{ id: string }>(
      `/teams/${options.teamId}/channels/${options.channelId}/messages`,
      undefined
    );

    return { success: true, messageId: result.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send message",
    };
  }
}

export async function replyToTeamsMessage(
  client: MicrosoftGraphClient,
  options: {
    teamId: string;
    channelId: string;
    messageId: string;
    content: string;
  }
): Promise<TeamsMessageActionResult> {
  try {
    const result = await client.get<{ id: string }>(
      `/teams/${options.teamId}/channels/${options.channelId}/messages/${options.messageId}/replies`,
      undefined
    );

    return { success: true, messageId: result.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reply",
    };
  }
}
