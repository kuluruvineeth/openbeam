import type { GoogleChatClient } from "../client";

export type SendMessageResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export async function sendChatMessage(
  client: GoogleChatClient,
  spaceName: string,
  text: string
): Promise<SendMessageResult> {
  try {
    const message = await client.sendMessage(spaceName, text);
    const messageId = message.name.split("/").pop();
    return { success: true, messageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Send message failed",
    };
  }
}
