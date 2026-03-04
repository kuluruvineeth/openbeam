import { type RateLimitConfig, rateLimiter } from "@openplane/redis";
import type { SmartThingsClientConfig } from "@openplane/types/services/connectors/smartthings";
import { logger } from "../lib/logger";
import { SmartThingsApiError } from "./types";

const BASE_URL = "https://api.smartthings.com/v1";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;
const DEFAULT_PAGE_SIZE = 200;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 50,
  requestsPerHour: 3000,
  burstLimit: 10,
};

export interface SmartThingsDevice {
  deviceId: string;
  name: string;
  label?: string;
  manufacturerName?: string;
  presentationId?: string;
  locationId?: string;
  roomId?: string;
  type?: string;
  components?: SmartThingsComponent[];
  healthState?: {
    state: string;
    lastUpdatedDate?: string;
  };
}

export interface SmartThingsComponent {
  id: string;
  label?: string;
  capabilities: { id: string; version: number }[];
  categories?: { name: string; categoryType: string }[];
}

export interface SmartThingsLocation {
  locationId: string;
  name: string;
  latitude?: number;
  longitude?: number;
  temperatureScale?: string;
  timeZoneId?: string;
  locale?: string;
  countryCode?: string;
  created?: string;
  lastModified?: string;
}

export interface SmartThingsRoom {
  roomId: string;
  locationId: string;
  name: string;
}

export interface SmartThingsScene {
  sceneId: string;
  sceneName: string;
  sceneIcon?: string;
  sceneColor?: string;
  locationId?: string;
  createdBy?: string;
  createdDate?: string;
  lastUpdatedDate?: string;
  lastExecutedDate?: string;
  editable?: boolean;
}

interface PagedResponse<T> {
  items: T[];
  _links?: {
    next?: { href: string };
    previous?: { href: string };
  };
}

export interface SmartThingsClient {
  readonly connectorId: string;
  listDevices(params?: {
    locationId?: string;
    page?: number;
    max?: number;
  }): Promise<{ devices: SmartThingsDevice[]; hasMore: boolean }>;
  listLocations(): Promise<SmartThingsLocation[]>;
  listRooms(locationId: string): Promise<SmartThingsRoom[]>;
  listScenes(params?: {
    locationId?: string;
    page?: number;
    max?: number;
  }): Promise<{ scenes: SmartThingsScene[]; hasMore: boolean }>;
  healthCheck(): Promise<boolean>;
}

export function createSmartThingsClient(
  config: SmartThingsClientConfig
): SmartThingsClient {
  const { connectorId, accessToken, timeout = DEFAULT_TIMEOUT } = config;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "smartthings",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "smartthings",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new SmartThingsApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  async function fetchJson<T>(
    path: string,
    params?: Record<string, string>,
    attempt = 0
  ): Promise<T> {
    await checkRateLimit();

    const url = new URL(`${BASE_URL}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
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
      throw new SmartThingsApiError({
        message: "Unauthorized — invalid or expired access token",
        code: "UNAUTHORIZED",
        retryable: false,
      });
    }

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("X-RateLimit-Reset") ?? "60",
        10
      );
      if (attempt < DEFAULT_RETRY_ATTEMPTS) {
        const delay = Math.min(retryAfter * 1000, MAX_RETRY_DELAY);
        await sleep(delay);
        return fetchJson<T>(path, params, attempt + 1);
      }
      throw new SmartThingsApiError({
        message: "Rate limited by SmartThings API",
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
          "SmartThings API server error, retrying"
        );
        await sleep(delay);
        return fetchJson<T>(path, params, attempt + 1);
      }
      throw new SmartThingsApiError({
        message: `SmartThings API ${response.status}: ${body}`,
        code: "API_ERROR",
        retryable: false,
      });
    }

    return response.json() as Promise<T>;
  }

  async function listDevices(params?: {
    locationId?: string;
    page?: number;
    max?: number;
  }): Promise<{ devices: SmartThingsDevice[]; hasMore: boolean }> {
    const queryParams: Record<string, string> = {
      includeHealth: "true",
      max: String(params?.max ?? DEFAULT_PAGE_SIZE),
    };

    if (params?.page != null) {
      queryParams.page = String(params.page);
    }
    if (params?.locationId) {
      queryParams.locationId = params.locationId;
    }

    const response = await fetchJson<PagedResponse<SmartThingsDevice>>(
      "/devices",
      queryParams
    );

    return {
      devices: response.items ?? [],
      hasMore: response._links?.next != null,
    };
  }

  async function listLocations(): Promise<SmartThingsLocation[]> {
    const response =
      await fetchJson<PagedResponse<SmartThingsLocation>>("/locations");
    return response.items ?? [];
  }

  async function listRooms(locationId: string): Promise<SmartThingsRoom[]> {
    const response = await fetchJson<PagedResponse<SmartThingsRoom>>(
      `/locations/${locationId}/rooms`
    );
    return response.items ?? [];
  }

  async function listScenes(params?: {
    locationId?: string;
    page?: number;
    max?: number;
  }): Promise<{ scenes: SmartThingsScene[]; hasMore: boolean }> {
    const queryParams: Record<string, string> = {
      max: String(params?.max ?? DEFAULT_PAGE_SIZE),
    };

    if (params?.page != null) {
      queryParams.page = String(params.page);
    }
    if (params?.locationId) {
      queryParams.locationId = params.locationId;
    }

    const response = await fetchJson<PagedResponse<SmartThingsScene>>(
      "/scenes",
      queryParams
    );

    return {
      scenes: response.items ?? [],
      hasMore: response._links?.next != null,
    };
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await fetchJson<PagedResponse<SmartThingsDevice>>("/devices", {
        max: "1",
      });
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    listDevices,
    listLocations,
    listRooms,
    listScenes,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
