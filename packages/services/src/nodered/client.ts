import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type {
  NodeRedConnectionConfig,
  NodeRedFlow,
  NodeRedNode,
  NodeRedNodeType,
  NodeRedSettings,
} from "@openbeam/types/services/connectors/nodered";
import { logger } from "../lib/logger";
import { NodeRedApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;
const TRAILING_SLASHES = /\/+$/;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 30,
  requestsPerHour: 1000,
  burstLimit: 10,
};

export interface NodeRedClient {
  readonly connectorId: string;
  getFlows(): Promise<Array<NodeRedFlow | NodeRedNode>>;
  getFlow(id: string): Promise<NodeRedFlow>;
  getNodes(): Promise<NodeRedNodeType[]>;
  getSettings(): Promise<NodeRedSettings>;
  healthCheck(): Promise<boolean>;
}

export function createNodeRedClient(
  config: NodeRedConnectionConfig
): NodeRedClient {
  const {
    connectorId,
    baseUrl,
    accessToken,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  const normalizedBaseUrl = baseUrl.replace(TRAILING_SLASHES, "");

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "nodered",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "nodered",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new NodeRedApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  async function fetchJson<T>(path: string, attempt = 0): Promise<T> {
    await checkRateLimit();

    const url = `${normalizedBaseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401 || response.status === 403) {
      throw new NodeRedApiError({
        message: "Unauthorized — invalid or expired access token",
        code: "UNAUTHORIZED",
        retryable: false,
      });
    }

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "60",
        10
      );
      if (attempt < DEFAULT_RETRY_ATTEMPTS) {
        const delay = Math.min(retryAfter * 1000, MAX_RETRY_DELAY);
        await sleep(delay);
        return fetchJson<T>(path, attempt + 1);
      }
      throw new NodeRedApiError({
        message: "Rate limited by Node-RED API",
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
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
          "Node-RED API server error, retrying"
        );
        await sleep(delay);
        return fetchJson<T>(path, attempt + 1);
      }
      throw new NodeRedApiError({
        message: `Node-RED API ${response.status}: ${body}`,
        code: "API_ERROR",
        retryable: false,
      });
    }

    return response.json() as Promise<T>;
  }

  function getFlows(): Promise<Array<NodeRedFlow | NodeRedNode>> {
    return fetchJson<Array<NodeRedFlow | NodeRedNode>>("/flows");
  }

  function getFlow(id: string): Promise<NodeRedFlow> {
    return fetchJson<NodeRedFlow>(`/flow/${id}`);
  }

  function getNodes(): Promise<NodeRedNodeType[]> {
    return fetchJson<NodeRedNodeType[]>("/nodes");
  }

  function getSettings(): Promise<NodeRedSettings> {
    return fetchJson<NodeRedSettings>("/settings");
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await fetchJson<NodeRedSettings>("/settings");
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    getFlows,
    getFlow,
    getNodes,
    getSettings,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
