import type {
  BotResponse,
  PlatformAdapter,
  PlatformConfig,
  UnifiedMessage,
} from "@openbeam/types/bot";
import { PLATFORM_CONFIGS } from "@openbeam/types/bot";
import { Bot } from "grammy";
import { z } from "zod";
import { formatForPlatform } from "../ai/formatter";
import { env } from "../env";

const COMMAND_RE = /^\/(\w+)(?:\s+(.*))?$/s;

const MARKDOWNV2_ESCAPE_RE = /([_*[\]()~`>#+\-=|{}.!\\])/g;

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

export function escapeMarkdownV2(text: string): string {
  return text.replace(MARKDOWNV2_ESCAPE_RE, "\\$1");
}

let botInstance: Bot | null = null;

function getBot(): Bot | null {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return null;
  }
  botInstance ??= new Bot(token);
  return botInstance;
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
    const bot = getBot();
    if (!bot) {
      return;
    }

    const text = formatForPlatform("TELEGRAM", response);
    const escaped = escapeMarkdownV2(text);

    await bot.api.sendMessage(message.channelId, escaped, {
      parse_mode: "MarkdownV2",
    });
  }

  async sendTypingIndicator(channelId: string): Promise<void> {
    const bot = getBot();
    if (!bot) {
      return;
    }

    await bot.api.sendChatAction(Number(channelId), "typing");
  }
}
