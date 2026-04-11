import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import { logger } from "../lib/logger";
import { TelegramApiError, TelegramErrorCodes } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 15_000;

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 30,
  requestsPerHour: 1000,
  burstLimit: 10,
};

interface TelegramClientConfig {
  botToken: string;
  connectorId: string;
  rateLimitConfig?: RateLimitConfig;
  timeout?: number;
}

interface TelegramApiResponse<T = unknown> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
  parameters?: { retry_after?: number };
}

interface MessageResult {
  message_id: number;
  chat: { id: number };
}

export interface TelegramClient {
  readonly connectorId: string;
  call<T>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<TelegramApiResponse<T>>;
  sendMessage(
    chatId: number,
    text: string,
    options?: Record<string, unknown>
  ): Promise<MessageResult | null>;
  editMessageText(params: {
    chatId: number;
    messageId: number;
    text: string;
    options?: Record<string, unknown>;
  }): Promise<boolean>;
  sendChatAction(chatId: number, action: string): Promise<boolean>;
  healthCheck(): Promise<boolean>;
}

export function createTelegramClient(
  config: TelegramClientConfig
): TelegramClient {
  const {
    botToken,
    connectorId,
    rateLimitConfig = DEFAULT_RATE_LIMITS,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  const baseUrl = `https://api.telegram.org/bot${botToken}`;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "telegram",
      rateLimitConfig
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "telegram",
        rateLimitConfig,
        5
      );

      if (!quotaAvailable) {
        throw new TelegramApiError(
          "Rate limit exceeded",
          TelegramErrorCodes.RATE_LIMITED,
          true,
          60
        );
      }
    }
  }

  async function call<T>(
    method: string,
    params?: Record<string, unknown>,
    attempt = 0
  ): Promise<TelegramApiResponse<T>> {
    await checkRateLimit();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(`${baseUrl}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: params ? JSON.stringify(params) : undefined,
        signal: controller.signal,
      });

      const data = (await res.json()) as TelegramApiResponse<T>;

      if (!data.ok) {
        const error = TelegramApiError.fromResponse(
          data.error_code,
          data.description
        );

        if (error.retryable && attempt < DEFAULT_RETRY_ATTEMPTS) {
          const retryAfter = data.parameters?.retry_after;
          const delay = retryAfter
            ? retryAfter * 1000
            : Math.min(
                BASE_RETRY_DELAY * 2 ** attempt + Math.random() * 1000,
                MAX_RETRY_DELAY
              );
          await sleep(delay);
          return call<T>(method, params, attempt + 1);
        }

        throw error;
      }

      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  async function sendMessage(
    chatId: number,
    text: string,
    options?: Record<string, unknown>
  ): Promise<MessageResult | null> {
    try {
      const res = await call<MessageResult>("sendMessage", {
        chat_id: chatId,
        text,
        ...options,
      });
      return res.result ?? null;
    } catch (error) {
      logger.debug({ error, chatId, connectorId }, "Telegram send failed");
      return null;
    }
  }

  async function editMessageText(params: {
    chatId: number;
    messageId: number;
    text: string;
    options?: Record<string, unknown>;
  }): Promise<boolean> {
    try {
      await call("editMessageText", {
        chat_id: params.chatId,
        message_id: params.messageId,
        text: params.text,
        ...params.options,
      });
      return true;
    } catch {
      return false;
    }
  }

  async function sendChatAction(
    chatId: number,
    action: string
  ): Promise<boolean> {
    try {
      await call("sendChatAction", { chat_id: chatId, action });
      return true;
    } catch {
      return false;
    }
  }

  async function healthCheck(): Promise<boolean> {
    try {
      const res = await call("getMe");
      return res.ok;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    call: <T>(method: string, params?: Record<string, unknown>) =>
      call<T>(method, params),
    sendMessage,
    editMessageText,
    sendChatAction,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { DEFAULT_RATE_LIMITS };
