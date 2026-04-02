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
    const result = await client.post<{ id: string }>(
      `/teams/${options.teamId}/channels/${options.channelId}/messages`,
      { body: { contentType: "html", content: options.content } }
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
    const result = await client.post<{ id: string }>(
      `/teams/${options.teamId}/channels/${options.channelId}/messages/${options.messageId}/replies`,
      { body: { contentType: "html", content: options.content } }
    );

    return { success: true, messageId: result.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reply",
    };
  }
}
