import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { JenkinsClientConfig } from "@openbeam/types/services/connectors/jenkins";
import { logger } from "../lib/logger";
import { JenkinsApiError } from "./types";

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

export interface JenkinsClient {
  readonly connectorId: string;
  readonly instanceUrl: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  getText(path: string): Promise<string>;
  post<T>(path: string): Promise<T>;
  healthCheck(): Promise<boolean>;
}

export function createJenkinsClient(
  config: JenkinsClientConfig
): JenkinsClient {
  const {
    connectorId,
    instanceUrl,
    username,
    apiToken,
    timeout = DEFAULT_TIMEOUT,
  } = config;
  const baseUrl = instanceUrl.replace(TRAILING_SLASHES, "");
  const basicAuth = Buffer.from(`${username}:${apiToken}`).toString("base64");

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "jenkins",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "jenkins",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new JenkinsApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  async function fetchRaw(
    path: string,
    params?: Record<string, string>,
    attempt = 0
  ): Promise<Response> {
    await checkRateLimit();

    const url = new URL(`${baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, value);
        }
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401) {
      throw new JenkinsApiError({
        message: "Unauthorized - invalid username or API token",
        code: "UNAUTHORIZED",
        statusCode: 401,
        retryable: false,
      });
    }

    if (response.status === 403) {
      throw new JenkinsApiError({
        message: "Forbidden - insufficient permissions",
        code: "FORBIDDEN",
        statusCode: 403,
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
          "Jenkins API server error, retrying"
        );
        await sleep(delay);
        return fetchRaw(path, params, attempt + 1);
      }
      throw new JenkinsApiError({
        message: `Jenkins API ${response.status}: ${body}`,
        code: "API_ERROR",
        statusCode: response.status,
        retryable: false,
      });
    }

    return response;
  }

  async function fetchJson<T>(
    path: string,
    params?: Record<string, string>,
    attempt = 0
  ): Promise<T> {
    const response = await fetchRaw(path, params, attempt);
    return response.json() as Promise<T>;
  }

  async function fetchText(path: string): Promise<string> {
    const response = await fetchRaw(path);
    return response.text();
  }

  async function postRequest<T>(path: string): Promise<T> {
    await checkRateLimit();

    const url = new URL(`${baseUrl}${path}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401) {
      throw new JenkinsApiError({
        message: "Unauthorized",
        code: "UNAUTHORIZED",
        statusCode: 401,
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new JenkinsApiError({
        message: `Jenkins API POST ${response.status}: ${body}`,
        code: "API_ERROR",
        statusCode: response.status,
        retryable: false,
      });
    }

    const text = await response.text();
    if (!text) {
      return {} as T;
    }
    return JSON.parse(text) as T;
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await fetchJson("/api/json", { tree: "mode,nodeDescription" });
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    instanceUrl: baseUrl,
    get: fetchJson,
    getText: fetchText,
    post: postRequest,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
