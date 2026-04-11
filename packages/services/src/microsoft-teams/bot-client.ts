import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import { logger } from "../lib/logger";

const TOKEN_URL =
  "https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token";
const DEFAULT_SERVICE_URL = "https://smba.trafficmanager.net/amer/";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 15_000;

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 30,
  requestsPerHour: 500,
  burstLimit: 5,
};

interface TeamsBotClientConfig {
  appId: string;
  appPassword: string;
  connectorId: string;
  serviceUrl?: string;
  rateLimitConfig?: RateLimitConfig;
  timeout?: number;
}

export interface TeamsBotClient {
  readonly connectorId: string;
  readonly appId: string;
  acquireToken(): Promise<string | null>;
  createConversation(params: {
    userId: string;
    tenantId: string;
  }): Promise<string | null>;
  sendActivity(
    conversationId: string,
    activity: Record<string, unknown>
  ): Promise<boolean>;
  sendProactiveMessage(params: {
    userId: string;
    tenantId: string;
    activity: Record<string, unknown>;
  }): Promise<boolean>;
}

export function createTeamsBotClient(
  config: TeamsBotClientConfig
): TeamsBotClient {
  const {
    appId,
    appPassword,
    connectorId,
    serviceUrl = DEFAULT_SERVICE_URL,
    rateLimitConfig = DEFAULT_RATE_LIMITS,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  let cachedToken: string | null = null;
  let tokenExpiresAt = 0;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "teams-bot",
      rateLimitConfig
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "teams-bot",
        rateLimitConfig,
        5
      );

      if (!quotaAvailable) {
        throw new Error("Teams bot rate limit exceeded");
      }
    }
  }

  async function acquireToken(): Promise<string | null> {
    if (cachedToken && Date.now() < tokenExpiresAt) {
      return cachedToken;
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: appId,
      client_secret: appPassword,
      scope: "https://api.botframework.com/.default",
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(TOKEN_URL, {
        method: "POST",
        body,
        signal: controller.signal,
      });

      if (!res.ok) {
        logger.debug(
          { status: res.status, connectorId },
          "Teams bot token acquisition failed"
        );
        return null;
      }

      const data = (await res.json()) as {
        access_token?: string;
        expires_in?: number;
      };

      if (!data.access_token) {
        return null;
      }

      cachedToken = data.access_token;
      tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000 - 60_000;
      return cachedToken;
    } finally {
      clearTimeout(timer);
    }
  }

  async function botFetch(
    path: string,
    body: Record<string, unknown>,
    attempt = 0
  ): Promise<Response> {
    await checkRateLimit();

    const token = await acquireToken();
    if (!token) {
      throw new Error("Failed to acquire Teams bot token");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(`${serviceUrl}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok && res.status >= 500 && attempt < DEFAULT_RETRY_ATTEMPTS) {
        const delay = Math.min(
          BASE_RETRY_DELAY * 2 ** attempt + Math.random() * 1000,
          MAX_RETRY_DELAY
        );
        await sleep(delay);
        return botFetch(path, body, attempt + 1);
      }

      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  async function createConversation(params: {
    userId: string;
    tenantId: string;
  }): Promise<string | null> {
    try {
      const res = await botFetch("v3/conversations", {
        bot: { id: appId },
        members: [{ id: params.userId }],
        channelData: { tenant: { id: params.tenantId } },
        isGroup: false,
      });

      if (!res.ok) {
        return null;
      }

      const data = (await res.json()) as { id?: string };
      return data.id ?? null;
    } catch (error) {
      logger.debug({ error, connectorId }, "Teams create conversation failed");
      return null;
    }
  }

  async function sendActivity(
    conversationId: string,
    activity: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const res = await botFetch(
        `v3/conversations/${conversationId}/activities`,
        activity
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  async function sendProactiveMessage(params: {
    userId: string;
    tenantId: string;
    activity: Record<string, unknown>;
  }): Promise<boolean> {
    const conversationId = await createConversation({
      userId: params.userId,
      tenantId: params.tenantId,
    });
    if (!conversationId) {
      return false;
    }
    return sendActivity(conversationId, params.activity);
  }

  return {
    connectorId,
    appId,
    acquireToken,
    createConversation,
    sendActivity,
    sendProactiveMessage,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { DEFAULT_RATE_LIMITS as TEAMS_BOT_RATE_LIMITS };
