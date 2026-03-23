import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { WorkdayClientConfig } from "@openbeam/types/services/connectors/workday";
import { logger } from "../lib/logger";
import { WorkdayApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;
const DEFAULT_PAGE_SIZE = 100;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 50,
  requestsPerHour: 2000,
  burstLimit: 8,
};

export interface WorkdayWorker {
  id: string;
  descriptor: string;
  primaryWorkEmail?: string;
  primaryWorkPhone?: string;
  businessTitle?: string;
  supervisoryOrganization?: { id: string; descriptor: string };
  location?: { id: string; descriptor: string };
  hireDate?: string;
  workerType?: string;
  isActive?: boolean;
  firstName?: string;
  lastName?: string;
  employeeId?: string;
}

export interface WorkdayOrganization {
  id: string;
  descriptor: string;
  organizationType?: string;
  parent?: { id: string; descriptor: string };
  manager?: { id: string; descriptor: string };
  memberCount?: number;
  isActive?: boolean;
}

interface WorkdayPagedResponse<T> {
  data: T[];
  total: number;
}

export interface WorkdayClient {
  readonly connectorId: string;
  readonly tenant: string;
  readonly host: string;
  getWorkers(params?: {
    offset?: number;
    limit?: number;
  }): Promise<WorkdayPagedResponse<WorkdayWorker>>;
  getWorker(id: string): Promise<WorkdayWorker>;
  getOrganizations(params?: {
    offset?: number;
    limit?: number;
  }): Promise<WorkdayPagedResponse<WorkdayOrganization>>;
  healthCheck(): Promise<boolean>;
}

export function createWorkdayClient(
  config: WorkdayClientConfig
): WorkdayClient {
  const {
    connectorId,
    accessToken,
    tenant,
    host,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  const baseUrl = `https://${host}/ccx/api/v1/${encodeURIComponent(tenant)}`;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "workday",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "workday",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new WorkdayApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  async function fetchApi(
    path: string,
    queryParams?: Record<string, string>,
    attempt = 0
  ): Promise<Response> {
    await checkRateLimit();

    const url = new URL(`${baseUrl}${path}`);
    if (queryParams) {
      for (const [k, v] of Object.entries(queryParams)) {
        if (v !== undefined && v !== "") {
          url.searchParams.set(k, v);
        }
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "GET",
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
      throw new WorkdayApiError({
        message: "Invalid access token or insufficient permissions",
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
        await sleep(retryAfter * 1000);
        return fetchApi(path, queryParams, attempt + 1);
      }
      throw new WorkdayApiError({
        message: "Rate limited by Workday",
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (!response.ok) {
      const respBody = await response.text();
      if (response.status >= 500 && attempt < DEFAULT_RETRY_ATTEMPTS) {
        const delay = Math.min(
          BASE_RETRY_DELAY * 2 ** attempt,
          MAX_RETRY_DELAY
        );
        logger.warn(
          { status: response.status, attempt, delay },
          "Workday API server error, retrying"
        );
        await sleep(delay);
        return fetchApi(path, queryParams, attempt + 1);
      }
      throw new WorkdayApiError({
        message: `Workday API ${response.status}: ${respBody}`,
        code: "API_ERROR",
        retryable: false,
      });
    }

    return response;
  }

  async function getWorkers(params?: {
    offset?: number;
    limit?: number;
  }): Promise<WorkdayPagedResponse<WorkdayWorker>> {
    const limit = params?.limit ?? DEFAULT_PAGE_SIZE;
    const offset = params?.offset ?? 0;

    const response = await fetchApi("/workers", {
      limit: String(limit),
      offset: String(offset),
    });

    const body = (await response.json()) as {
      data?: WorkdayWorker[];
      total?: number;
    };

    return {
      data: body.data ?? [],
      total: body.total ?? 0,
    };
  }

  async function getWorker(id: string): Promise<WorkdayWorker> {
    const response = await fetchApi(`/workers/${encodeURIComponent(id)}`);
    return response.json() as Promise<WorkdayWorker>;
  }

  async function getOrganizations(params?: {
    offset?: number;
    limit?: number;
  }): Promise<WorkdayPagedResponse<WorkdayOrganization>> {
    const limit = params?.limit ?? DEFAULT_PAGE_SIZE;
    const offset = params?.offset ?? 0;

    const response = await fetchApi("/organizations", {
      limit: String(limit),
      offset: String(offset),
    });

    const body = (await response.json()) as {
      data?: WorkdayOrganization[];
      total?: number;
    };

    return {
      data: body.data ?? [],
      total: body.total ?? 0,
    };
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await getWorkers({ limit: 1, offset: 0 });
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    tenant,
    host,
    getWorkers,
    getWorker,
    getOrganizations,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
