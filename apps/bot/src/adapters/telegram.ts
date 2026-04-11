import type { TelegramClient } from "@openbeam/services";
import { createTelegramClient } from "@openbeam/services";
import type {
  BotResponse,
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

const TelegramMessageSchema = z.object({
  message_id: z.number(),
  from: TelegramUserSchema.optional(),
  chat: TelegramChatSchema,
  date: z.number(),
  text: z.string().optional(),
});

const TelegramUpdateSchema = z.object({
  update_id: z.number(),
  message: TelegramMessageSchema.optional(),
  edited_message: TelegramMessageSchema.optional(),
  channel_post: TelegramMessageSchema.optional(),
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
    const message = extractMessage(update);
    if (!message?.from) {
      return Promise.resolve(null);
    }

    const text = message.text ?? "";
    const { command, body } = parseText(text);

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
}
