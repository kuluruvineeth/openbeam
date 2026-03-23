import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { GreenhouseClientConfig } from "@openbeam/types/services/connectors/greenhouse";
import { logger } from "../lib/logger";
import { GreenhouseApiError } from "./types";

const BASE_URL = "https://harvest.greenhouse.io/v1";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;
const DEFAULT_PER_PAGE = 100;
const MAX_PER_PAGE = 500;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 120,
  requestsPerHour: 5000,
  burstLimit: 20,
};

export interface GreenhouseJob {
  id: number;
  name: string;
  status: string;
  departments: Array<{ id: number; name: string }>;
  offices: Array<{ id: number; name: string }>;
  hiring_team: {
    hiring_managers: Array<{
      user_id: number;
      first_name: string;
      last_name: string;
      name: string;
    }>;
    recruiters: Array<{
      user_id: number;
      first_name: string;
      last_name: string;
      name: string;
    }>;
    coordinators: Array<{
      user_id: number;
      first_name: string;
      last_name: string;
      name: string;
    }>;
  };
  openings: Array<{ id: number; status: string }>;
  created_at: string;
  updated_at: string;
  notes: string | null;
  confidential: boolean;
  is_template: boolean | null;
}

export interface GreenhouseCandidate {
  id: number;
  first_name: string;
  last_name: string;
  company: string | null;
  title: string | null;
  emails: Array<{ value: string; type: string }>;
  phone_numbers: Array<{ value: string; type: string }>;
  tags: string[];
  applications: Array<{ id: number; status: string }>;
  created_at: string;
  updated_at: string;
  last_activity: string;
  is_private: boolean;
}

export interface GreenhouseApplication {
  id: number;
  candidate_id: number;
  status: string;
  current_stage: { id: number; name: string } | null;
  source: { id: number; public_name: string } | null;
  jobs: Array<{ id: number; name: string }>;
  rejection_reason: {
    id: number;
    name: string;
    type: { id: number; name: string };
  } | null;
  applied_at: string;
  rejected_at: string | null;
  last_activity_at: string;
  prospect: boolean;
  created_at: string;
  updated_at: string;
}

export interface GreenhouseOffer {
  id: number;
  application_id: number;
  status: string;
  starts_at: string | null;
  created_at: string;
  sent_at: string | null;
  resolved_at: string | null;
  version: number;
}

interface PaginatedResult<T> {
  data: T[];
  nextUrl: string | null;
}

export interface GreenhouseClient {
  readonly connectorId: string;
  listJobs(params?: {
    updatedAfter?: string;
    perPage?: number;
    status?: string;
    departmentId?: number;
  }): AsyncGenerator<PaginatedResult<GreenhouseJob>>;
  listCandidates(params?: {
    updatedAfter?: string;
    perPage?: number;
  }): AsyncGenerator<PaginatedResult<GreenhouseCandidate>>;
  listApplications(params?: {
    updatedAfter?: string;
    perPage?: number;
    status?: string;
  }): AsyncGenerator<PaginatedResult<GreenhouseApplication>>;
  listOffers(params?: {
    updatedAfter?: string;
    perPage?: number;
  }): AsyncGenerator<PaginatedResult<GreenhouseOffer>>;
  getDepartments(): Promise<Array<{ id: number; name: string }>>;
  addCandidateNote(
    candidateId: number,
    body: string,
    userId: number
  ): Promise<{ id: number }>;
  healthCheck(): Promise<boolean>;
}

const LINK_NEXT_RE = /<([^>]+)>;\s*rel="next"/;

function parseLinkHeader(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const match = LINK_NEXT_RE.exec(header);
  return match?.[1] ?? null;
}

export function createGreenhouseClient(
  config: GreenhouseClientConfig
): GreenhouseClient {
  const { connectorId, apiKey, timeout = DEFAULT_TIMEOUT } = config;
  const authHeader = `Basic ${btoa(`${apiKey}:`)}`;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "greenhouse",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "greenhouse",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new GreenhouseApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 30,
        });
      }
    }
  }

  async function request<T>(
    url: string,
    options: { method?: string; body?: unknown } = {},
    attempt = 0
  ): Promise<{ data: T; linkNext: string | null }> {
    await checkRateLimit();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const fetchOptions: RequestInit = {
      method: options.method ?? "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await fetch(url, fetchOptions);
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401 || response.status === 403) {
      throw new GreenhouseApiError({
        message: `Greenhouse API ${response.status}: invalid or insufficient API key`,
        code: "UNAUTHORIZED",
        retryable: false,
      });
    }

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "30",
        10
      );
      if (attempt < DEFAULT_RETRY_ATTEMPTS) {
        await sleep(retryAfter * 1000);
        return request(url, options, attempt + 1);
      }
      throw new GreenhouseApiError({
        message: "Rate limited by Greenhouse",
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status >= 500) {
      if (attempt < DEFAULT_RETRY_ATTEMPTS) {
        const delay = Math.min(
          BASE_RETRY_DELAY * 2 ** attempt,
          MAX_RETRY_DELAY
        );
        logger.warn(
          { status: response.status, attempt, delay },
          "Greenhouse API server error, retrying"
        );
        await sleep(delay);
        return request(url, options, attempt + 1);
      }
      throw new GreenhouseApiError({
        message: `Greenhouse API server error: ${response.status}`,
        code: "SERVER_ERROR",
        retryable: true,
      });
    }

    if (!response.ok) {
      const body = await response.text();
      throw new GreenhouseApiError({
        message: `Greenhouse API ${response.status}: ${body}`,
        code: "API_ERROR",
        retryable: false,
      });
    }

    const data = (await response.json()) as T;
    const linkNext = parseLinkHeader(response.headers.get("Link"));
    return { data, linkNext };
  }

  function buildUrl(
    path: string,
    params?: Record<string, string | number | undefined>
  ): string {
    const url = new URL(`${BASE_URL}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  async function* paginate<T>(
    path: string,
    params?: Record<string, string | number | undefined>
  ): AsyncGenerator<PaginatedResult<T>> {
    const perPage = Math.min(
      (params?.per_page as number | undefined) ?? DEFAULT_PER_PAGE,
      MAX_PER_PAGE
    );
    let url: string | null = buildUrl(path, { ...params, per_page: perPage });

    while (url) {
      const result: { data: T[]; linkNext: string | null } =
        await request<T[]>(url);
      yield { data: result.data, nextUrl: result.linkNext };
      url = result.linkNext;
    }
  }

  function listJobs(params?: {
    updatedAfter?: string;
    perPage?: number;
    status?: string;
    departmentId?: number;
  }): AsyncGenerator<PaginatedResult<GreenhouseJob>> {
    return paginate<GreenhouseJob>("/jobs", {
      updated_after: params?.updatedAfter,
      per_page: params?.perPage,
      status: params?.status,
      department_id: params?.departmentId,
    });
  }

  function listCandidates(params?: {
    updatedAfter?: string;
    perPage?: number;
  }): AsyncGenerator<PaginatedResult<GreenhouseCandidate>> {
    return paginate<GreenhouseCandidate>("/candidates", {
      updated_after: params?.updatedAfter,
      per_page: params?.perPage,
    });
  }

  function listApplications(params?: {
    updatedAfter?: string;
    perPage?: number;
    status?: string;
  }): AsyncGenerator<PaginatedResult<GreenhouseApplication>> {
    return paginate<GreenhouseApplication>("/applications", {
      updated_after: params?.updatedAfter,
      per_page: params?.perPage,
      status: params?.status,
    });
  }

  function listOffers(params?: {
    updatedAfter?: string;
    perPage?: number;
  }): AsyncGenerator<PaginatedResult<GreenhouseOffer>> {
    return paginate<GreenhouseOffer>("/offers", {
      updated_after: params?.updatedAfter,
      per_page: params?.perPage,
    });
  }

  async function getDepartments(): Promise<
    Array<{ id: number; name: string }>
  > {
    const url = buildUrl("/departments", { per_page: MAX_PER_PAGE });
    const result = await request<Array<{ id: number; name: string }>>(url);
    return result.data;
  }

  async function addCandidateNote(
    candidateId: number,
    body: string,
    userId: number
  ): Promise<{ id: number }> {
    const url = buildUrl(`/candidates/${candidateId}/activity_feed/notes`);
    const result = await request<{ id: number }>(url, {
      method: "POST",
      body: { user_id: userId, body },
    });
    return result.data;
  }

  async function healthCheck(): Promise<boolean> {
    try {
      const url = buildUrl("/jobs", { per_page: 1 });
      await request(url);
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    listJobs,
    listCandidates,
    listApplications,
    listOffers,
    getDepartments,
    addCandidateNote,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
