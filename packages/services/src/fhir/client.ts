import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type {
  FhirClientConfig,
  FhirResource,
} from "@openbeam/types/services/connectors/fhir";
import { logger } from "../lib/logger";
import { FhirApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 60,
  requestsPerHour: 2000,
  burstLimit: 15,
};

const TRAILING_SLASH_RE = /\/$/;

export interface FhirBundle<T extends FhirResource = FhirResource> {
  resourceType: "Bundle";
  type: string;
  total?: number;
  entry?: { resource: T; fullUrl?: string }[];
  link?: { relation: string; url: string }[];
}

export interface FhirClient {
  readonly connectorId: string;
  read<T extends FhirResource>(resourceType: string, id: string): Promise<T>;
  search<T extends FhirResource>(
    resourceType: string,
    params?: Record<string, string>
  ): Promise<FhirBundle<T>>;
  searchAll<T extends FhirResource>(
    resourceType: string,
    params?: Record<string, string>
  ): AsyncGenerator<T[], void, undefined>;
  healthCheck(): Promise<boolean>;
}

export function createFhirClient(config: FhirClientConfig): FhirClient {
  const {
    connectorId,
    fhirBaseUrl,
    accessToken,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  const baseUrl = fhirBaseUrl.replace(TRAILING_SLASH_RE, "");

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "fhir",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "fhir",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new FhirApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  async function request<T>(
    path: string,
    options: RequestInit = {},
    attempt = 0
  ): Promise<T> {
    await checkRateLimit();

    const url = path.startsWith("http") ? path : `${baseUrl}/${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/fhir+json",
          "Content-Type": "application/fhir+json",
          ...options.headers,
        },
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
        return request<T>(path, options, attempt + 1);
      }
      throw new FhirApiError({
        message: "Rate limited",
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      throw new FhirApiError({
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
          "FHIR server error, retrying"
        );
        await sleep(delay);
        return request<T>(path, options, attempt + 1);
      }
      throw new FhirApiError({
        message: `FHIR API ${response.status}: ${body}`,
        code: "API_ERROR",
        retryable: false,
      });
    }

    return response.json() as Promise<T>;
  }

  function read<T extends FhirResource>(
    resourceType: string,
    id: string
  ): Promise<T> {
    return request<T>(`${resourceType}/${id}`);
  }

  function search<T extends FhirResource>(
    resourceType: string,
    params?: Record<string, string>
  ): Promise<FhirBundle<T>> {
    const searchParams = new URLSearchParams(params);
    const query = searchParams.toString();
    const path = query ? `${resourceType}?${query}` : resourceType;
    return request<FhirBundle<T>>(path);
  }

  async function* searchAll<T extends FhirResource>(
    resourceType: string,
    params?: Record<string, string>
  ): AsyncGenerator<T[], void, undefined> {
    let bundle = await search<T>(resourceType, params);

    while (true) {
      const entries = bundle.entry?.map((e) => e.resource) ?? [];
      if (entries.length > 0) {
        yield entries;
      }

      const nextLink = bundle.link?.find((l) => l.relation === "next");
      if (!nextLink) {
        break;
      }

      bundle = await request<FhirBundle<T>>(nextLink.url);
    }
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await request("metadata");
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    read,
    search,
    searchAll,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
