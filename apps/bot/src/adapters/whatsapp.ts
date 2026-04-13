import { createHmac, timingSafeEqual } from "node:crypto";
import type { WhatsAppClient } from "@openbeam/services";
import { createWhatsAppClient } from "@openbeam/services";
import type {
  BotResponse,
  MessageAttachment,
  PlatformAdapter,
  PlatformConfig,
  ProactiveTarget,
  UnifiedMessage,
} from "@openbeam/types/bot";
import { PLATFORM_CONFIGS } from "@openbeam/types/bot";
import { z } from "zod";
import { env } from "../env";
import { renderWhatsApp } from "../renderers/whatsapp";

const WhatsAppMetadataSchema = z.object({
  display_phone_number: z.string(),
  phone_number_id: z.string(),
});

const WhatsAppMediaSchema = z.object({
  id: z.string(),
  mime_type: z.string().optional(),
  voice: z.boolean().optional(),
});

const WhatsAppMessageBaseSchema = z.object({
  id: z.string(),
  from: z.string(),
  timestamp: z.string(),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
  interactive: z.record(z.string(), z.unknown()).optional(),
  audio: WhatsAppMediaSchema.optional(),
  image: WhatsAppMediaSchema.optional(),
  video: WhatsAppMediaSchema.optional(),
  document: WhatsAppMediaSchema.extend({
    filename: z.string().optional(),
  }).optional(),
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

function extractAttachments(message: WhatsAppMessage): MessageAttachment[] {
  if (message.audio) {
    return [
      {
        type: "audio",
        platformMediaId: message.audio.id,
        mimeType: message.audio.mime_type,
      },
    ];
  }
  if (message.image) {
    return [
      {
        type: "image",
        platformMediaId: message.image.id,
        mimeType: message.image.mime_type,
      },
    ];
  }
  if (message.video) {
    return [
      {
        type: "video",
        platformMediaId: message.video.id,
        mimeType: message.video.mime_type,
      },
    ];
  }
  if (message.document) {
    return [
      {
        type: "document",
        platformMediaId: message.document.id,
        mimeType: message.document.mime_type,
        name: message.document.filename,
      },
    ];
  }
  return [];
}

function buildWhatsAppClient(): WhatsAppClient | null {
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = env.WHATSAPP_ACCESS_TOKEN;
  if (!(phoneNumberId && accessToken)) {
    return null;
  }
  return createWhatsAppClient({
    phoneNumberId,
    accessToken,
    connectorId: `bot_whatsapp_${phoneNumberId}`,
  });
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
  private readonly client = buildWhatsAppClient();

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
    const attachments = extractAttachments(message);

    if (!text && attachments.length === 0) {
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
      ...(attachments.length > 0 && { attachments }),
    });
  }

  async sendResponse(
    message: UnifiedMessage,
    response: BotResponse
  ): Promise<void> {
    if (!this.client) {
      return;
    }

    const payload = renderWhatsApp(message.channelId, response);
    await this.client.sendMessage(payload);
  }

  async sendTypingIndicator(
    _channelId: string,
    _threadId?: string,
    messageId?: string
  ): Promise<void> {
    if (!(messageId && this.client)) {
      return;
    }

    await this.client.sendTypingIndicator(messageId);
  }

  async sendProactive(
    target: ProactiveTarget,
    response: BotResponse
  ): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    const payload = renderWhatsApp(target.platformUserId, response);
    return await this.client.sendMessage(payload);
  }
}
