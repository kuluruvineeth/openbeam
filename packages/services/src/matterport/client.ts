import { type RateLimitConfig, rateLimiter } from "@openplane/redis";
import type { MatterportClientConfig } from "@openplane/types/services/connectors/matterport";
import { logger } from "../lib/logger";
import { MatterportApiError } from "./types";

const MATTERPORT_API_URL = "https://api.matterport.com/api/models/graph";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 50,
  requestsPerHour: 1000,
  burstLimit: 10,
};

export interface MatterportClient {
  readonly connectorId: string;
  query<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
  healthCheck(): Promise<boolean>;
}

export function createMatterportClient(
  config: MatterportClientConfig
): MatterportClient {
  const {
    connectorId,
    tokenId,
    tokenSecret,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  const authHeader = `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "matterport",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "matterport",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new MatterportApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  async function executeQuery<T>(
    query: string,
    variables?: Record<string, unknown>,
    attempt = 0
  ): Promise<T> {
    await checkRateLimit();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(MATTERPORT_API_URL, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "60",
        10
      );
      if (attempt < DEFAULT_RETRY_ATTEMPTS) {
        await sleep(Math.min(retryAfter * 1000, MAX_RETRY_DELAY));
        return executeQuery<T>(query, variables, attempt + 1);
      }
      throw new MatterportApiError({
        message: "Rate limited",
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      throw new MatterportApiError({
        message: `Unauthorized: ${response.status}`,
        code: response.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        retryable: false,
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
          "Matterport API server error, retrying"
        );
        await sleep(delay);
        return executeQuery<T>(query, variables, attempt + 1);
      }
      throw new MatterportApiError({
        message: `Matterport API ${response.status}: ${body}`,
        code: "API_ERROR",
        retryable: false,
      });
    }

    const json = (await response.json()) as {
      data?: T;
      errors?: { message: string; extensions?: Record<string, unknown> }[];
    };

    if (json.errors?.length) {
      throw new MatterportApiError({
        message: json.errors[0]?.message ?? "Unknown GraphQL error",
        code: "GRAPHQL_ERROR",
        retryable: false,
      });
    }

    return json.data as T;
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await executeQuery("{ me { id } }");
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    query: executeQuery,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
