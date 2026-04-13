import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import { logger } from "../lib/logger";
import { WhatsAppApiError, WhatsAppErrorCodes } from "./types";

const DEFAULT_API_VERSION = "v19.0";
const TYPING_API_VERSION = "v21.0";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 15_000;

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 80,
  requestsPerHour: 1000,
  burstLimit: 10,
};

interface WhatsAppClientConfig {
  phoneNumberId: string;
  accessToken: string;
  connectorId: string;
  apiVersion?: string;
  rateLimitConfig?: RateLimitConfig;
  timeout?: number;
}

export interface WhatsAppClient {
  readonly connectorId: string;
  readonly phoneNumberId: string;
  sendMessage(payload: Record<string, unknown>): Promise<boolean>;
  sendTypingIndicator(messageId: string): Promise<boolean>;
  downloadMedia(mediaId: string): Promise<Buffer>;
  healthCheck(): Promise<boolean>;
}

export function createWhatsAppClient(
  config: WhatsAppClientConfig
): WhatsAppClient {
  const {
    phoneNumberId,
    accessToken,
    connectorId,
    apiVersion = DEFAULT_API_VERSION,
    rateLimitConfig = DEFAULT_RATE_LIMITS,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  function graphUrl(version = apiVersion): string {
    return `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
  }

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "whatsapp",
      rateLimitConfig
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "whatsapp",
        rateLimitConfig,
        5
      );

      if (!quotaAvailable) {
        throw new WhatsAppApiError(
          "Rate limit exceeded",
          WhatsAppErrorCodes.RATE_LIMITED,
          true,
          60
        );
      }
    }
  }

  async function post(
    payload: Record<string, unknown>,
    version = apiVersion,
    attempt = 0
  ): Promise<Response> {
    await checkRateLimit();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(graphUrl(version), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text();
        const error = WhatsAppApiError.fromStatus(res.status, body);

        if (error.retryable && attempt < DEFAULT_RETRY_ATTEMPTS) {
          const delay = Math.min(
            BASE_RETRY_DELAY * 2 ** attempt + Math.random() * 1000,
            MAX_RETRY_DELAY
          );
          await sleep(delay);
          return post(payload, version, attempt + 1);
        }

        throw error;
      }

      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  async function sendMessage(
    payload: Record<string, unknown>
  ): Promise<boolean> {
    try {
      await post(payload);
      return true;
    } catch (error) {
      logger.debug({ error, connectorId }, "WhatsApp send failed");
      return false;
    }
  }

  async function sendTypingIndicator(messageId: string): Promise<boolean> {
    try {
      await post(
        {
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
          typing_indicator: { type: "text" },
        },
        TYPING_API_VERSION
      );
      return true;
    } catch {
      return false;
    }
  }

  async function healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const res = await fetch(
          `https://graph.facebook.com/${apiVersion}/${phoneNumberId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal,
          }
        );
        return res.ok;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return false;
    }
  }

  async function downloadMedia(mediaId: string): Promise<Buffer> {
    await checkRateLimit();

    const metaRes = await fetch(
      `https://graph.facebook.com/${apiVersion}/${mediaId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!metaRes.ok) {
      throw new WhatsAppApiError(
        `Media metadata fetch failed: ${metaRes.status}`,
        WhatsAppErrorCodes.INTERNAL_ERROR,
        false
      );
    }

    const meta = (await metaRes.json()) as { url?: string };
    if (!meta.url) {
      throw new WhatsAppApiError(
        "Media URL not found in response",
        WhatsAppErrorCodes.INTERNAL_ERROR,
        false
      );
    }

    const dataRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!dataRes.ok) {
      throw new WhatsAppApiError(
        `Media download failed: ${dataRes.status}`,
        WhatsAppErrorCodes.INTERNAL_ERROR,
        false
      );
    }

    return Buffer.from(await dataRes.arrayBuffer());
  }

  return {
    connectorId,
    phoneNumberId,
    sendMessage,
    sendTypingIndicator,
    downloadMedia,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { DEFAULT_RATE_LIMITS };
