import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { BambooHRClientConfig } from "@openbeam/types/services/connectors/bamboohr";
import { logger } from "../lib/logger";
import { BambooHRApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 80,
  requestsPerHour: 3000,
  burstLimit: 10,
};

const EMPLOYEE_FIELDS = [
  "displayName",
  "firstName",
  "lastName",
  "preferredName",
  "workEmail",
  "homeEmail",
  "bestEmail",
  "jobTitle",
  "department",
  "division",
  "location",
  "workPhone",
  "mobilePhone",
  "hireDate",
  "originalHireDate",
  "status",
  "employeeNumber",
  "supervisor",
  "supervisorEId",
  "supervisorEmail",
  "photoUrl",
  "employmentHistoryStatus",
  "terminationDate",
  "country",
  "city",
  "state",
] as const;

export interface BambooHREmployee {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  workEmail: string;
  homeEmail: string;
  bestEmail: string;
  jobTitle: string;
  department: string;
  division: string;
  location: string;
  workPhone: string;
  mobilePhone: string;
  hireDate: string;
  originalHireDate: string;
  status: string;
  employeeNumber: string;
  supervisor: string;
  supervisorEId: string;
  supervisorEmail: string;
  photoUrl: string;
  employmentHistoryStatus: string;
  terminationDate: string;
  country: string;
  city: string;
  state: string;
}

export interface BambooHRTimeOffRequest {
  id: string;
  employeeId: string;
  name: string;
  status: { lastChanged: string; lastChangedByUserId: string; status: string };
  start: string;
  end: string;
  created: string;
  type: { id: string; name: string; icon: string };
  amount: { unit: string; amount: string };
  notes: { employee: string; manager: string };
  dates: Record<string, string>;
}

export interface BambooHRDirectory {
  fields: Array<{ id: string; type: string; name: string }>;
  employees: BambooHREmployee[];
}

export interface BambooHRChangedEmployees {
  employees: Record<
    string,
    { id: string; action: string; lastChanged: string }
  >;
  latest: string;
}

export interface BambooHRClient {
  readonly connectorId: string;
  readonly subdomain: string;
  getDirectory(): Promise<BambooHRDirectory>;
  getEmployee(id: string): Promise<BambooHREmployee>;
  getChangedEmployees(since: string): Promise<BambooHRChangedEmployees>;
  getTimeOffRequests(params: {
    start: string;
    end: string;
  }): Promise<BambooHRTimeOffRequest[]>;
  put<T>(path: string, body: unknown): Promise<T>;
  healthCheck(): Promise<boolean>;
}

export function createBambooHRClient(
  config: BambooHRClientConfig
): BambooHRClient {
  const { connectorId, apiKey, subdomain, timeout = DEFAULT_TIMEOUT } = config;

  const baseUrl = `https://api.bamboohr.com/api/gateway.php/${encodeURIComponent(subdomain)}/v1`;
  const authHeader = `Basic ${btoa(`${apiKey}:x`)}`;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "bamboohr",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "bamboohr",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new BambooHRApiError({
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
          Authorization: authHeader,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401 || response.status === 403) {
      throw new BambooHRApiError({
        message: "Invalid API key or insufficient permissions",
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
      throw new BambooHRApiError({
        message: "Rate limited by BambooHR",
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
          "BambooHR API server error, retrying"
        );
        await sleep(delay);
        return fetchApi(path, queryParams, attempt + 1);
      }
      throw new BambooHRApiError({
        message: `BambooHR API ${response.status}: ${respBody}`,
        code: "API_ERROR",
        retryable: false,
      });
    }

    return response;
  }

  async function getDirectory(): Promise<BambooHRDirectory> {
    const response = await fetchApi("/employees/directory");
    return response.json() as Promise<BambooHRDirectory>;
  }

  async function getEmployee(id: string): Promise<BambooHREmployee> {
    const fields = EMPLOYEE_FIELDS.join(",");
    const response = await fetchApi(`/employees/${id}/`, { fields });
    return response.json() as Promise<BambooHREmployee>;
  }

  async function getChangedEmployees(
    since: string
  ): Promise<BambooHRChangedEmployees> {
    const response = await fetchApi("/employees/changed", { since });
    return response.json() as Promise<BambooHRChangedEmployees>;
  }

  async function getTimeOffRequests(params: {
    start: string;
    end: string;
  }): Promise<BambooHRTimeOffRequest[]> {
    const response = await fetchApi("/time_off/requests/", {
      start: params.start,
      end: params.end,
    });
    return response.json() as Promise<BambooHRTimeOffRequest[]>;
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await getDirectory();
      return true;
    } catch {
      return false;
    }
  }

  async function put<T>(path: string, body: unknown): Promise<T> {
    await checkRateLimit();
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new BambooHRApiError({
        message: `BambooHR API PUT ${response.status}: ${text}`,
        code: response.status === 429 ? "RATE_LIMITED" : "API_ERROR",
        retryable: response.status >= 500,
      });
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return response.json() as Promise<T>;
  }

  return {
    connectorId,
    subdomain,
    getDirectory,
    getEmployee,
    getChangedEmployees,
    getTimeOffRequests,
    put,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
