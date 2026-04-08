import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  BotResponse,
  PlatformAdapter,
  PlatformConfig,
  UnifiedMessage,
} from "@openbeam/types/bot";
import { PLATFORM_CONFIGS } from "@openbeam/types/bot";
import { z } from "zod";
import { formatForPlatform } from "../ai/formatter";
import { env } from "../env";

const GRAPH_API_VERSION = "v19.0";
const MAX_BUTTON_COUNT = 3;
const MAX_BUTTON_TITLE_LENGTH = 20;

const WhatsAppMetadataSchema = z.object({
  display_phone_number: z.string(),
  phone_number_id: z.string(),
});

const WhatsAppTextMessageSchema = z.object({
  type: z.literal("text"),
  text: z.object({ body: z.string() }),
});

const WhatsAppInteractiveReplySchema = z.object({
  type: z.literal("interactive"),
  interactive: z.object({
    type: z.enum(["button_reply", "list_reply"]),
    button_reply: z.object({ id: z.string(), title: z.string() }).optional(),
    list_reply: z
      .object({
        id: z.string(),
        title: z.string(),
        description: z.string().optional(),
      })
      .optional(),
  }),
});

const WhatsAppMessageSchema = z
  .discriminatedUnion("type", [
    WhatsAppTextMessageSchema,
    WhatsAppInteractiveReplySchema,
    z.object({ type: z.string() }),
  ])
  .and(
    z.object({
      id: z.string(),
      from: z.string(),
      timestamp: z.string(),
    })
  );

const WhatsAppValueSchema = z.object({
  messaging_product: z.literal("whatsapp"),
  metadata: WhatsAppMetadataSchema,
  messages: z.array(WhatsAppMessageSchema).optional(),
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

function verifySignature(
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

function extractText(message: z.infer<typeof WhatsAppMessageSchema>): string {
  if (message.type === "text") {
    return (message as z.infer<typeof WhatsAppTextMessageSchema>).text.body;
  }
  if (message.type === "interactive") {
    const msg = message as z.infer<typeof WhatsAppInteractiveReplySchema>;
    return (
      msg.interactive.button_reply?.title ??
      msg.interactive.list_reply?.title ??
      ""
    );
  }
  return "";
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

function buildInteractivePayload(
  to: string,
  text: string,
  buttons: BotResponse["buttons"]
): Record<string, unknown> {
  const validButtons = (buttons ?? []).slice(0, MAX_BUTTON_COUNT);
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: truncate(text, 1024) },
      action: {
        buttons: validButtons.map((btn) => ({
          type: "reply",
          reply: {
            id: btn.value,
            title: truncate(btn.label, MAX_BUTTON_TITLE_LENGTH),
          },
        })),
      },
    },
  };
}

function buildTextPayload(to: string, text: string): Record<string, unknown> {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { body: truncate(text, PLATFORM_CONFIGS.WHATSAPP.maxMessageLength) },
  };
}

async function postToGraphApi(
  phoneNumberId: string,
  accessToken: string,
  payload: Record<string, unknown>
): Promise<void> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
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
    return verifySignature(_rawBody, header, appSecret);
  }

  async parseEvent(
    rawBody: unknown,
    _headers: Record<string, string>
  ): Promise<UnifiedMessage | null> {
    await Promise.resolve();
    const parsed = WhatsAppWebhookSchema.safeParse(rawBody);
    if (!parsed.success) {
      return null;
    }

    const entry = parsed.data.entry[0];
    if (!entry) {
      return null;
    }

    const change = entry.changes[0];
    if (!change) {
      return null;
    }

    const { value } = change;
    const message = value.messages?.[0];
    if (!message) {
      return null;
    }

    const text = extractText(message);
    if (!text) {
      return null;
    }

    return {
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
    };
  }

  async sendResponse(
    message: UnifiedMessage,
    response: BotResponse
  ): Promise<void> {
    const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = env.WHATSAPP_ACCESS_TOKEN;
    if (!(phoneNumberId && accessToken)) {
      return;
    }

    const text = formatForPlatform("WHATSAPP", response);
    const hasButtons = response.buttons && response.buttons.length > 0;

    const payload = hasButtons
      ? buildInteractivePayload(message.channelId, text, response.buttons)
      : buildTextPayload(message.channelId, text);

    await postToGraphApi(phoneNumberId, accessToken, payload);
  }

  sendTypingIndicator(_channelId: string, _threadId?: string): Promise<void> {
    return Promise.resolve();
  }
}
