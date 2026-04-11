import type { TelegramClient } from "../client";

export interface SendDmResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

export async function sendDm(
  client: TelegramClient,
  chatId: number,
  text: string,
  options?: Record<string, unknown>
): Promise<SendDmResult> {
  const result = await client.sendMessage(chatId, text, options);
  if (!result) {
    return { success: false, error: "Failed to send Telegram message" };
  }
  return { success: true, messageId: result.message_id };
}
