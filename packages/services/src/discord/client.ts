import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import { logger } from "../lib/logger";
import { DiscordApiError, DiscordErrorCodes } from "./types";

const API_BASE = "https://discord.com/api/v10";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 15_000;

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 50,
  requestsPerHour: 1000,
  burstLimit: 10,
};

interface DiscordClientConfig {
  botToken: string;
  applicationId: string;
  connectorId: string;
  rateLimitConfig?: RateLimitConfig;
  timeout?: number;
}

export interface DiscordClient {
  readonly connectorId: string;
  readonly applicationId: string;
  request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T>;
  openDm(userId: string): Promise<{ id: string } | null>;
  sendChannelMessage(
    channelId: string,
    payload: DiscordMessagePayload
  ): Promise<boolean>;
  sendDm(userId: string, payload: DiscordMessagePayload): Promise<boolean>;
  postInteractionCallback(
    interactionId: string,
    token: string,
    body: Record<string, unknown>
  ): Promise<void>;
  patchOriginalMessage(
    interactionToken: string,
    payload: Record<string, unknown>
  ): Promise<Response>;
  healthCheck(): Promise<boolean>;
}

export interface DiscordMessagePayload {
  content?: string;
  embeds?: Record<string, unknown>[];
  components?: Record<string, unknown>[];
}

export function createDiscordClient(
  config: DiscordClientConfig
): DiscordClient {
  const {
    botToken,
    applicationId,
    connectorId,
    rateLimitConfig = DEFAULT_RATE_LIMITS,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  const authHeaders = {
    Authorization: `Bot ${botToken}`,
    "Content-Type": "application/json",
  };

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "discord",
      rateLimitConfig
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "discord",
        rateLimitConfig,
        5
      );

      if (!quotaAvailable) {
        throw new DiscordApiError(
          "Rate limit exceeded",
          DiscordErrorCodes.RATE_LIMITED,
          true,
          60
        );
      }
    }
  }

  async function request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    attempt = 0
  ): Promise<T> {
    await checkRateLimit();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: authHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        const resBody = await res.text();
        const error = DiscordApiError.fromStatus(res.status, resBody);

        if (error.retryable && attempt < DEFAULT_RETRY_ATTEMPTS) {
          const delay = Math.min(
            BASE_RETRY_DELAY * 2 ** attempt + Math.random() * 1000,
            MAX_RETRY_DELAY
          );
          if (error.retryAfter) {
            await sleep(error.retryAfter * 1000);
          } else {
            await sleep(delay);
          }
          return request<T>(method, path, body, attempt + 1);
        }

        throw error;
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async function openDm(userId: string): Promise<{ id: string } | null> {
    try {
      return await request<{ id: string }>("POST", "/users/@me/channels", {
        recipient_id: userId,
      });
    } catch (error) {
      logger.debug(
        { error, userId, connectorId },
        "Discord DM channel open failed"
      );
      return null;
    }
  }

  async function sendChannelMessage(
    channelId: string,
    payload: DiscordMessagePayload
  ): Promise<boolean> {
    try {
      await request("POST", `/channels/${channelId}/messages`, {
        ...payload,
      });
      return true;
    } catch {
      return false;
    }
  }

  async function sendDm(
    userId: string,
    payload: DiscordMessagePayload
  ): Promise<boolean> {
    const dm = await openDm(userId);
    if (!dm) {
      return false;
    }
    return sendChannelMessage(dm.id, payload);
  }

  async function postInteractionCallback(
    interactionId: string,
    token: string,
    body: Record<string, unknown>
  ): Promise<void> {
    await fetch(`${API_BASE}/interactions/${interactionId}/${token}/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function patchOriginalMessage(
    interactionToken: string,
    payload: Record<string, unknown>
  ): Promise<Response> {
    const url = `${API_BASE}/webhooks/${applicationId}/${interactionToken}/messages/@original`;
    return fetch(url, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await request("GET", "/users/@me");
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    applicationId,
    request: <T>(
      method: string,
      path: string,
      body?: Record<string, unknown>
    ) => request<T>(method, path, body),
    openDm,
    sendChannelMessage,
    sendDm,
    postInteractionCallback,
    patchOriginalMessage,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { DEFAULT_RATE_LIMITS };
