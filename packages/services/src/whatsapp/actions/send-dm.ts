import type { WhatsAppClient } from "../client";

export interface SendDmResult {
  success: boolean;
  error?: string;
}

export async function sendDm(
  client: WhatsAppClient,
  to: string,
  payload: Record<string, unknown>
): Promise<SendDmResult> {
  const sent = await client.sendMessage({ ...payload, to });
  if (!sent) {
    return { success: false, error: "Failed to send WhatsApp message" };
  }
  return { success: true };
}

export function textPayload(to: string, text: string): Record<string, unknown> {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { body: text },
  };
}
