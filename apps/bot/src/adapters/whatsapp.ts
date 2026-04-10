import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  BotResponse,
  PlatformAdapter,
  PlatformConfig,
  UnifiedMessage,
} from "@openbeam/types/bot";
import { PLATFORM_CONFIGS } from "@openbeam/types/bot";
import { z } from "zod";
import { env } from "../env";
import { renderWhatsApp, typingPayload } from "../renderers/whatsapp";

const GRAPH_API_VERSION = "v19.0";
const GRAPH_API_VERSION_TYPING = "v21.0";

const WhatsAppMetadataSchema = z.object({
  display_phone_number: z.string(),
  phone_number_id: z.string(),
});

const WhatsAppMessageBaseSchema = z.object({
  id: z.string(),
  from: z.string(),
  timestamp: z.string(),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
  interactive: z.record(z.string(), z.unknown()).optional(),
});

type WhatsAppMessage = z.infer<typeof WhatsAppMessageBaseSchema>;

const WhatsAppValueSchema = z.object({
  messaging_product: z.literal("whatsapp"),
  metadata: WhatsAppMetadataSchema,
  messages: z.array(WhatsAppMessageBaseSchema).optional(),
  statuses: z.array(z.unknown()).optional(),
});

const WhatsAppChangeSchema = z.object({
  value: WhatsAppValueSchema,
  field: z.string(),
});

const WhatsAppEntrySchema = z.object({
  id: z.string(),
  changes: z.array(WhatsAppChangeSchema),
});

const WhatsAppWebhookSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(WhatsAppEntrySchema),
});

function verifySig(
  rawBody: string,
  header: string,
  appSecret: string
): boolean {
  const signature = header.startsWith("sha256=") ? header.slice(7) : header;
  const expected = createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");
  try {
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

function extractText(message: WhatsAppMessage): string {
  if (message.type === "text" && message.text) {
    return message.text.body;
  }
  if (message.type === "interactive" && message.interactive) {
    const reply = message.interactive.button_reply as
      | { title?: string }
      | undefined;
    return reply?.title ?? "";
  }
  return "";
}

async function postToGraphApi(
  phoneNumberId: string,
  accessToken: string,
  payload: Record<string, unknown>,
  apiVersion = GRAPH_API_VERSION
): Promise<void> {
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WhatsApp API error ${response.status}: ${body}`);
  }
}

export function handleWhatsAppVerification(
  mode: string | null,
  token: string | null,
  challenge: string | null
): string | null {
  const verifyToken = env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    return null;
  }
  if (mode === "subscribe" && token === verifyToken) {
    return challenge;
  }
  return null;
}

export class WhatsAppAdapter implements PlatformAdapter {
  readonly platform = "WHATSAPP" as const;
  readonly config: PlatformConfig = PLATFORM_CONFIGS.WHATSAPP;

  verifySignature(_rawBody: string, headers: Record<string, string>): boolean {
    const appSecret = env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      return false;
    }
    const header = headers["x-hub-signature-256"] ?? "";
    if (!header) {
      return false;
    }
    return verifySig(_rawBody, header, appSecret);
  }

  parseEvent(
    rawBody: unknown,
    _headers: Record<string, string>
  ): Promise<UnifiedMessage | null> {
    const parsed = WhatsAppWebhookSchema.safeParse(rawBody);
    if (!parsed.success) {
      return Promise.resolve(null);
    }

    const entry = parsed.data.entry[0];
    if (!entry) {
      return Promise.resolve(null);
    }

    const change = entry.changes[0];
    if (!change) {
      return Promise.resolve(null);
    }

    const { value } = change;
    const message = value.messages?.[0];
    if (!message) {
      return Promise.resolve(null);
    }

    const text = extractText(message);
    if (!text) {
      return Promise.resolve(null);
    }

    return Promise.resolve({
      id: message.id,
      platform: "WHATSAPP",
      platformUserId: message.from,
      platformTeamId: entry.id,
      channelId: message.from,
      text,
      isDirectMessage: true,
      isMention: false,
      timestamp: new Date(Number(message.timestamp) * 1000),
      rawEvent: rawBody,
    });
  }

  async sendResponse(
    message: UnifiedMessage,
    response: BotResponse
  ): Promise<void> {
    const creds = this.getCredentials();
    if (!creds) {
      return;
    }

    const payload = renderWhatsApp(message.channelId, response);
    await postToGraphApi(creds.phoneNumberId, creds.accessToken, payload);
  }

  async sendTypingIndicator(
    _channelId: string,
    _threadId?: string,
    messageId?: string
  ): Promise<void> {
    if (!messageId) {
      return;
    }
    const creds = this.getCredentials();
    if (!creds) {
      return;
    }

    const payload = typingPayload(messageId);
    await postToGraphApi(
      creds.phoneNumberId,
      creds.accessToken,
      payload,
      GRAPH_API_VERSION_TYPING
    ).catch((err) => {
      console.warn("typing indicator failed", err.message);
    });
  }

  private getCredentials(): {
    phoneNumberId: string;
    accessToken: string;
  } | null {
    const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = env.WHATSAPP_ACCESS_TOKEN;
    if (!(phoneNumberId && accessToken)) {
      return null;
    }
    return { phoneNumberId, accessToken };
  }
}
