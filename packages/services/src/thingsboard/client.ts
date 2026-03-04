import { type RateLimitConfig, rateLimiter } from "@openplane/redis";
import type {
  ThingsboardAlarm,
  ThingsboardAttribute,
  ThingsboardConnectionConfig,
  ThingsboardDashboard,
  ThingsboardDevice,
  ThingsboardPageData,
  ThingsboardTelemetryValue,
} from "@openplane/types/services/connectors/thingsboard";
import { logger } from "../lib/logger";
import { ThingsboardApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;
const DEFAULT_PAGE_SIZE = 100;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 50,
  requestsPerHour: 3000,
  burstLimit: 10,
};

interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface ThingsboardClient {
  readonly connectorId: string;
  listDevices(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<ThingsboardPageData<ThingsboardDevice>>;
  getDeviceTelemetry(
    deviceId: string,
    keys?: string[]
  ): Promise<Record<string, ThingsboardTelemetryValue[]>>;
  getDeviceAttributes(deviceId: string): Promise<ThingsboardAttribute[]>;
  listAlarms(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<ThingsboardPageData<ThingsboardAlarm>>;
  listDashboards(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<ThingsboardPageData<ThingsboardDashboard>>;
  healthCheck(): Promise<boolean>;
}

export function createThingsboardClient(
  config: ThingsboardConnectionConfig
): ThingsboardClient {
  const {
    connectorId,
    baseUrl,
    username,
    password,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  let authTokens: AuthTokens | null = null;

  async function authenticate(): Promise<AuthTokens> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401 || response.status === 403) {
      throw new ThingsboardApiError({
        message: "Authentication failed — invalid username or password",
        code: "UNAUTHORIZED",
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = await response.text();
      throw new ThingsboardApiError({
        message: `ThingsBoard auth ${response.status}: ${body}`,
        code: "AUTH_ERROR",
        retryable: false,
      });
    }

    const tokens = (await response.json()) as AuthTokens;
    authTokens = tokens;
    return tokens;
  }

  async function getToken(): Promise<string> {
    if (!authTokens) {
      const tokens = await authenticate();
      return tokens.token;
    }
    return authTokens.token;
  }

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "thingsboard",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "thingsboard",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new ThingsboardApiError({
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

    const token = await getToken();
    const url = new URL(`${baseUrl}${path}`);
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
          "X-Authorization": `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401 || response.status === 403) {
      if (attempt === 0) {
        authTokens = null;
        return fetchJson<T>(path, params, attempt + 1);
      }
      throw new ThingsboardApiError({
        message: "Unauthorized — invalid or expired token",
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
        return fetchJson<T>(path, params, attempt + 1);
      }
      throw new ThingsboardApiError({
        message: "Rate limited by ThingsBoard API",
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
          "ThingsBoard API server error, retrying"
        );
        await sleep(delay);
        return fetchJson<T>(path, params, attempt + 1);
      }
      throw new ThingsboardApiError({
        message: `ThingsBoard API ${response.status}: ${body}`,
        code: "API_ERROR",
        retryable: false,
      });
    }

    return response.json() as Promise<T>;
  }

  function listDevices(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<ThingsboardPageData<ThingsboardDevice>> {
    const queryParams: Record<string, string> = {
      pageSize: String(params?.pageSize ?? DEFAULT_PAGE_SIZE),
      page: String(params?.page ?? 0),
      sortProperty: "createdTime",
      sortOrder: "DESC",
    };

    return fetchJson<ThingsboardPageData<ThingsboardDevice>>(
      "/api/tenant/devices",
      queryParams
    );
  }

  function getDeviceTelemetry(
    deviceId: string,
    keys?: string[]
  ): Promise<Record<string, ThingsboardTelemetryValue[]>> {
    const queryParams: Record<string, string> = {};
    if (keys && keys.length > 0) {
      queryParams.keys = keys.join(",");
    }

    return fetchJson<Record<string, ThingsboardTelemetryValue[]>>(
      `/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries`,
      queryParams
    );
  }

  function getDeviceAttributes(
    deviceId: string
  ): Promise<ThingsboardAttribute[]> {
    return fetchJson<ThingsboardAttribute[]>(
      `/api/plugins/telemetry/DEVICE/${deviceId}/values/attributes`
    );
  }

  function listAlarms(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<ThingsboardPageData<ThingsboardAlarm>> {
    const queryParams: Record<string, string> = {
      pageSize: String(params?.pageSize ?? DEFAULT_PAGE_SIZE),
      page: String(params?.page ?? 0),
      sortProperty: "createdTime",
      sortOrder: "DESC",
    };

    return fetchJson<ThingsboardPageData<ThingsboardAlarm>>(
      "/api/alarms",
      queryParams
    );
  }

  function listDashboards(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<ThingsboardPageData<ThingsboardDashboard>> {
    const queryParams: Record<string, string> = {
      pageSize: String(params?.pageSize ?? DEFAULT_PAGE_SIZE),
      page: String(params?.page ?? 0),
      sortProperty: "title",
      sortOrder: "ASC",
    };

    return fetchJson<ThingsboardPageData<ThingsboardDashboard>>(
      "/api/tenant/dashboards",
      queryParams
    );
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await fetchJson<ThingsboardPageData<ThingsboardDevice>>(
        "/api/tenant/devices",
        { pageSize: "1", page: "0" }
      );
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    listDevices,
    getDeviceTelemetry,
    getDeviceAttributes,
    listAlarms,
    listDashboards,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
