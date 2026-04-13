import type { TelegramClient } from "@openbeam/services";
import { createTelegramClient } from "@openbeam/services";
import type {
  BotResponse,
  MessageAttachment,
  PlatformAdapter,
  PlatformConfig,
  ProactiveTarget,
  UnifiedMessage,
} from "@openbeam/types/bot";
import { PLATFORM_CONFIGS } from "@openbeam/types/bot";
import { Bot } from "grammy";
import { z } from "zod";
import { env } from "../env";
import { renderTelegram } from "../renderers/telegram";

const COMMAND_RE = /^\/(\w+)(?:\s+(.*))?$/s;

const TelegramUserSchema = z.object({
  id: z.number(),
  is_bot: z.boolean(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
});

const TelegramChatSchema = z.object({
  id: z.number(),
  type: z.enum(["private", "group", "supergroup", "channel"]),
  title: z.string().optional(),
  username: z.string().optional(),
});

const TelegramFileSchema = z.object({
  file_id: z.string(),
  file_unique_id: z.string(),
  file_size: z.number().optional(),
  duration: z.number().optional(),
  mime_type: z.string().optional(),
});

const TelegramPhotoSchema = z.object({
  file_id: z.string(),
  file_unique_id: z.string(),
  width: z.number(),
  height: z.number(),
  file_size: z.number().optional(),
});

const TelegramDocumentSchema = z.object({
  file_id: z.string(),
  file_unique_id: z.string(),
  file_name: z.string().optional(),
  mime_type: z.string().optional(),
  file_size: z.number().optional(),
});

const TelegramMessageSchema = z.object({
  message_id: z.number(),
  from: TelegramUserSchema.optional(),
  chat: TelegramChatSchema,
  date: z.number(),
  text: z.string().optional(),
  voice: TelegramFileSchema.optional(),
  audio: TelegramFileSchema.optional(),
  photo: z.array(TelegramPhotoSchema).optional(),
  document: TelegramDocumentSchema.optional(),
  video: TelegramFileSchema.optional(),
  caption: z.string().optional(),
});

const TelegramInlineQuerySchema = z.object({
  id: z.string(),
  from: TelegramUserSchema,
  query: z.string(),
  offset: z.string(),
  chat_type: z.string().optional(),
});

const TelegramUpdateSchema = z.object({
  update_id: z.number(),
  message: TelegramMessageSchema.optional(),
  edited_message: TelegramMessageSchema.optional(),
  channel_post: TelegramMessageSchema.optional(),
  inline_query: TelegramInlineQuerySchema.optional(),
});

type TelegramUpdate = z.infer<typeof TelegramUpdateSchema>;

function createBot(): Bot | null {
  const token = env.TELEGRAM_BOT_TOKEN;
  return token ? new Bot(token) : null;
}

function buildApiClient(): TelegramClient | null {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return null;
  }
  return createTelegramClient({
    botToken: token,
    connectorId: `bot_telegram_${token.split(":")[0]}`,
  });
}

function extractMessage(update: TelegramUpdate) {
  return update.message ?? update.edited_message ?? update.channel_post ?? null;
}

function parseText(text: string): {
  command: string | undefined;
  body: string;
} {
  const match = COMMAND_RE.exec(text);
  if (!match) {
    return { command: undefined, body: text };
  }
  return { command: match[1], body: (match[2] ?? "").trim() };
}

export class TelegramAdapter implements PlatformAdapter {
  readonly platform = "TELEGRAM" as const;
  readonly config: PlatformConfig = PLATFORM_CONFIGS.TELEGRAM;
  private readonly bot = createBot();
  private readonly apiClient = buildApiClient();

  verifySignature(_rawBody: string, headers: Record<string, string>): boolean {
    const secret = env.TELEGRAM_WEBHOOK_SECRET;
    if (!secret) {
      return false;
    }
    return headers["x-telegram-bot-api-secret-token"] === secret;
  }

  parseEvent(
    rawBody: unknown,
    _headers: Record<string, string>
  ): Promise<UnifiedMessage | null> {
    const parsed = TelegramUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return Promise.resolve(null);
    }

    const update = parsed.data;

    if (update.inline_query) {
      return Promise.resolve({
        id: update.inline_query.id,
        platform: "TELEGRAM",
        platformUserId: String(update.inline_query.from.id),
        platformTeamId: "",
        channelId: "",
        text: update.inline_query.query,
        isDirectMessage: false,
        isMention: false,
        timestamp: new Date(),
        rawEvent: update,
        interactionType: "callback",
        interactionData: {
          inlineQueryId: update.inline_query.id,
          offset: update.inline_query.offset,
        },
      });
    }

    const message = extractMessage(update);
    if (!message?.from) {
      return Promise.resolve(null);
    }

    const text = message.text ?? message.caption ?? "";
    const { command, body } = parseText(text);

    const attachments: MessageAttachment[] = [];
    if (message.voice) {
      attachments.push({
        type: "audio",
        platformMediaId: message.voice.file_id,
        mimeType: message.voice.mime_type,
        duration: message.voice.duration,
        size: message.voice.file_size,
      });
    }
    if (message.audio) {
      attachments.push({
        type: "audio",
        platformMediaId: message.audio.file_id,
        mimeType: message.audio.mime_type,
        duration: message.audio.duration,
        size: message.audio.file_size,
      });
    }
    if (message.photo && message.photo.length > 0) {
      const largest = message.photo.at(-1);
      if (largest) {
        attachments.push({
          type: "image",
          platformMediaId: largest.file_id,
          size: largest.file_size,
        });
      }
    }
    if (message.document) {
      attachments.push({
        type: "document",
        platformMediaId: message.document.file_id,
        name: message.document.file_name,
        mimeType: message.document.mime_type,
        size: message.document.file_size,
      });
    }
    if (message.video) {
      attachments.push({
        type: "video",
        platformMediaId: message.video.file_id,
        mimeType: message.video.mime_type,
        duration: message.video.duration,
        size: message.video.file_size,
      });
    }

    return Promise.resolve({
      id: String(update.update_id),
      platform: "TELEGRAM",
      platformUserId: String(message.from.id),
      platformTeamId: String(message.chat.id),
      channelId: String(message.chat.id),
      text: command ? body : text,
      command,
      isDirectMessage: message.chat.type === "private",
      isMention: false,
      timestamp: new Date(message.date * 1000),
      rawEvent: update,
      ...(attachments.length > 0 && { attachments }),
    });
  }

  async sendResponse(
    message: UnifiedMessage,
    response: BotResponse
  ): Promise<void> {
    const bot = this.bot;
    if (!bot) {
      return;
    }

    const payload = renderTelegram(response);

    await bot.api.sendMessage(message.channelId, payload.text, {
      parse_mode: payload.parse_mode,
      reply_markup: payload.reply_markup,
    });
  }

  async sendStreamPlaceholder(message: UnifiedMessage): Promise<number | null> {
    const bot = this.bot;
    if (!bot) {
      return null;
    }

    const sent = await bot.api.sendMessage(message.channelId, "Searching...");
    return sent.message_id;
  }

  async updateStreamMessage(
    message: UnifiedMessage,
    messageId: number,
    text: string
  ): Promise<void> {
    const bot = this.bot;
    if (!bot) {
      return;
    }

    const noop = Function.prototype as () => void;
    await bot.api
      .editMessageText(message.channelId, messageId, text)
      .catch(noop);
  }

  async finalizeStreamMessage(
    message: UnifiedMessage,
    messageId: number,
    response: BotResponse
  ): Promise<void> {
    const bot = this.bot;
    if (!bot) {
      return;
    }

    const payload = renderTelegram(response);
    await bot.api.editMessageText(message.channelId, messageId, payload.text, {
      parse_mode: payload.parse_mode,
      reply_markup: payload.reply_markup,
    });
  }

  async sendProactive(
    target: ProactiveTarget,
    response: BotResponse
  ): Promise<boolean> {
    if (!this.apiClient) {
      return false;
    }

    const payload = renderTelegram(response);
    const result = await this.apiClient.sendMessage(
      Number(target.platformUserId),
      payload.text,
      {
        parse_mode: payload.parse_mode,
        reply_markup: payload.reply_markup,
      }
    );
    return result !== null;
  }

  async sendTypingIndicator(channelId: string): Promise<void> {
    const bot = this.bot;
    if (!bot) {
      return;
    }

    await bot.api.sendChatAction(Number(channelId), "typing");
  }

  async answerInlineQuery(
    queryId: string,
    results: Record<string, unknown>[]
  ): Promise<void> {
    const bot = this.bot;
    if (!bot) {
      return;
    }

    await bot.api.answerInlineQuery(
      queryId,
      results as unknown as Parameters<typeof bot.api.answerInlineQuery>[1],
      { cache_time: 300 }
    );
  }
}
