import { createHmac } from "node:crypto";
import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { AzureIotClientConfig } from "@openbeam/types/services/connectors/azure-iot";
import { logger } from "../lib/logger";
import { AzureIotApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 2000;
const MAX_RETRY_DELAY = 30_000;
const SAS_TOKEN_TTL_MINS = 60;
const API_VERSION = "2021-04-12";

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 15,
  requestsPerHour: 900,
  burstLimit: 5,
};

export interface AzureIotTwin {
  deviceId: string;
  moduleId?: string;
  etag: string;
  deviceEtag: string;
  version: number;
  status: "enabled" | "disabled";
  statusReason?: string;
  statusUpdateTime: string;
  connectionState: "Connected" | "Disconnected";
  lastActivityTime: string;
  cloudToDeviceMessageCount: number;
  authenticationType?: string;
  capabilities?: { iotEdge: boolean };
  deviceScope?: string;
  parentScopes?: string[];
  tags: Record<string, unknown>;
  properties: {
    desired: Record<string, unknown>;
    reported: Record<string, unknown>;
  };
}

export interface AzureIotClient {
  readonly connectorId: string;
  readonly hubName: string;
  queryTwins(params: {
    query: string;
    pageSize?: number;
    continuationToken?: string;
  }): Promise<{ twins: AzureIotTwin[]; continuationToken?: string }>;
  healthCheck(): Promise<boolean>;
}

interface ParsedConnectionString {
  hostName: string;
  sharedAccessKeyName: string;
  sharedAccessKey: string;
}

function parseConnectionString(cs: string): ParsedConnectionString {
  const parts = new Map<string, string>();
  for (const pair of cs.split(";")) {
    const idx = pair.indexOf("=");
    if (idx > 0) {
      parts.set(pair.slice(0, idx), pair.slice(idx + 1));
    }
  }

  const hostName = parts.get("HostName");
  const keyName = parts.get("SharedAccessKeyName");
  const key = parts.get("SharedAccessKey");

  if (!(hostName && keyName && key)) {
    throw new AzureIotApiError({
      message:
        "Invalid connection string: missing HostName, SharedAccessKeyName, or SharedAccessKey",
      code: "INVALID_CONFIG",
      retryable: false,
    });
  }

  return { hostName, sharedAccessKeyName: keyName, sharedAccessKey: key };
}

function generateSasToken(
  resourceUri: string,
  signingKey: string,
  policyName: string,
  expiresInMins: number
): string {
  const encoded = encodeURIComponent(resourceUri);
  const expiry = Math.ceil(Date.now() / 1000 + expiresInMins * 60);
  const toSign = `${encoded}\n${expiry}`;

  const hmac = createHmac("sha256", Buffer.from(signingKey, "base64"));
  hmac.update(toSign);
  const sig = encodeURIComponent(hmac.digest("base64"));

  return `SharedAccessSignature sr=${encoded}&sig=${sig}&se=${expiry}&skn=${policyName}`;
}

export function createAzureIotClient(
  config: AzureIotClientConfig
): AzureIotClient {
  const { connectorId, connectionString, timeout = DEFAULT_TIMEOUT } = config;

  const parsed = parseConnectionString(connectionString);
  const hubName = parsed.hostName.split(".")[0] ?? parsed.hostName;

  let cachedToken: string | null = null;
  let tokenExpiresAt = 0;

  function getToken(): string {
    if (cachedToken && Date.now() < tokenExpiresAt) {
      return cachedToken;
    }

    cachedToken = generateSasToken(
      parsed.hostName,
      parsed.sharedAccessKey,
      parsed.sharedAccessKeyName,
      SAS_TOKEN_TTL_MINS
    );
    tokenExpiresAt = Date.now() + (SAS_TOKEN_TTL_MINS - 5) * 60 * 1000;
    return cachedToken;
  }

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "azure-iot",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "azure-iot",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new AzureIotApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  function queryTwins(params: {
    query: string;
    pageSize?: number;
    continuationToken?: string;
  }): Promise<{ twins: AzureIotTwin[]; continuationToken?: string }> {
    return fetchQuery(
      params.query,
      params.pageSize ?? 100,
      params.continuationToken
    );
  }

  async function fetchQuery(
    query: string,
    pageSize: number,
    continuationToken?: string,
    attempt = 0
  ): Promise<{ twins: AzureIotTwin[]; continuationToken?: string }> {
    await checkRateLimit();

    const token = getToken();
    const url = `https://${parsed.hostName}/devices/query?api-version=${API_VERSION}`;

    const headers: Record<string, string> = {
      Authorization: token,
      "Content-Type": "application/json",
      "x-ms-max-item-count": String(Math.min(pageSize, 100)),
    };

    if (continuationToken) {
      headers["x-ms-continuation"] = continuationToken;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401) {
      cachedToken = null;
      tokenExpiresAt = 0;
      if (attempt === 0) {
        return fetchQuery(query, pageSize, continuationToken, attempt + 1);
      }
      throw new AzureIotApiError({
        message: "Unauthorized — invalid connection string or expired token",
        code: "UNAUTHORIZED",
        retryable: false,
      });
    }

    if (response.status === 429) {
      if (attempt < DEFAULT_RETRY_ATTEMPTS) {
        const delay = Math.min(
          BASE_RETRY_DELAY * 2 ** attempt,
          MAX_RETRY_DELAY
        );
        await sleep(delay);
        return fetchQuery(query, pageSize, continuationToken, attempt + 1);
      }
      throw new AzureIotApiError({
        message: "Throttled by Azure IoT Hub",
        code: "THROTTLED",
        retryable: true,
        retryAfter: 5,
      });
    }

    if (!response.ok) {
      const body = await response.text();
      if (response.status >= 500 && attempt < DEFAULT_RETRY_ATTEMPTS) {
        const delay = Math.min(
          BASE_RETRY_DELAY * 2 ** attempt,
          MAX_RETRY_DELAY
        );
        logger.warn(
          { status: response.status, attempt, delay },
          "Azure IoT Hub server error, retrying"
        );
        await sleep(delay);
        return fetchQuery(query, pageSize, continuationToken, attempt + 1);
      }
      throw new AzureIotApiError({
        message: `Azure IoT Hub ${response.status}: ${body}`,
        code: "API_ERROR",
        retryable: false,
      });
    }

    const twins = (await response.json()) as AzureIotTwin[];
    const nextToken = response.headers.get("x-ms-continuation") ?? undefined;

    return { twins, continuationToken: nextToken };
  }

  async function healthCheck(): Promise<boolean> {
    try {
      const token = getToken();
      const url = `https://${parsed.hostName}/statistics/devices?api-version=${API_VERSION}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      let response: Response;
      try {
        response = await fetch(url, {
          headers: { Authorization: token },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      return response.ok;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    hubName,
    queryTwins,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
