import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { PhabricatorClientConfig } from "@openbeam/types/services/connectors/phabricator";
import { logger } from "../lib/logger";
import { PhabricatorApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const TRAILING_SLASHES = /\/+$/;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 120,
  requestsPerHour: 3600,
  burstLimit: 20,
};

export interface PhabricatorClient {
  readonly connectorId: string;
  readonly instanceUrl: string;
  post<T>(method: string, params?: Record<string, unknown>): Promise<T>;
  healthCheck(): Promise<boolean>;
}

interface ConduitResponse<T> {
  result: T;
  error_code: string | null;
  error_info: string | null;
}

export function createPhabricatorClient(
  config: PhabricatorClientConfig
): PhabricatorClient {
  const {
    connectorId,
    apiToken,
    instanceUrl,
    timeout = DEFAULT_TIMEOUT,
  } = config;
  const baseUrl = instanceUrl.replace(TRAILING_SLASHES, "");

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "phabricator",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "phabricator",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new PhabricatorApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  async function conduitCall<T>(
    method: string,
    params: Record<string, unknown> = {},
    attempt = 0
  ): Promise<T> {
    await checkRateLimit();

    const url = `${baseUrl}/api/${method}`;
    const formData = new URLSearchParams();
    formData.set("api.token", apiToken);
    formData.set("params", JSON.stringify(params));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: formData.toString(),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401 || response.status === 403) {
      throw new PhabricatorApiError({
        message: `Unauthorized - invalid API token (${response.status})`,
        code: response.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        statusCode: response.status,
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (response.status >= 500 && attempt < DEFAULT_RETRY_ATTEMPTS) {
        const delay = Math.min(
          BASE_RETRY_DELAY * 2 ** attempt + Math.random() * BASE_RETRY_DELAY,
          MAX_RETRY_DELAY
        );
        logger.warn(
          { connectorId, status: response.status, attempt },
          "Phabricator API server error, retrying"
        );
        await sleep(delay);
        return conduitCall<T>(method, params, attempt + 1);
      }
      throw new PhabricatorApiError({
        message: `Phabricator API ${response.status}: ${body}`,
        code: "API_ERROR",
        statusCode: response.status,
        retryable: false,
      });
    }

    const json = (await response.json()) as ConduitResponse<T>;

    if (json.error_code) {
      if (
        json.error_code === "ERR-INVALID-AUTH" ||
        json.error_code === "ERR-INVALID-SESSION"
      ) {
        throw new PhabricatorApiError({
          message: `Phabricator auth error: ${json.error_info}`,
          code: "UNAUTHORIZED",
          retryable: false,
        });
      }

      if (
        attempt < DEFAULT_RETRY_ATTEMPTS &&
        json.error_code === "ERR-RATE-LIMIT"
      ) {
        await sleep(Math.min(BASE_RETRY_DELAY * 2 ** attempt, MAX_RETRY_DELAY));
        return conduitCall<T>(method, params, attempt + 1);
      }

      throw new PhabricatorApiError({
        message: `Phabricator Conduit error [${json.error_code}]: ${json.error_info}`,
        code: json.error_code,
        retryable: false,
      });
    }

    return json.result;
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await conduitCall<{ userName: string }>("user.whoami");
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    instanceUrl: baseUrl,
    post: conduitCall,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
