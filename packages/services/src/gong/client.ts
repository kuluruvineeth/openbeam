import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { GongClientConfig } from "@openbeam/types/services/connectors/gong";
import { logger } from "../lib/logger";
import { GongApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;
const BASE_URL = "https://api.gong.io/v2";

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 150,
  requestsPerHour: 5000,
  burstLimit: 3,
};

export interface GongCall {
  id: string;
  title: string;
  started: string;
  duration: number;
  direction: string;
  scope: string;
  media: string;
  language: string;
  url: string;
  parties: GongParty[];
  purpose?: string;
  disposition?: string;
  meetingUrl?: string;
}

export interface GongParty {
  id: string;
  emailAddress?: string;
  name?: string;
  title?: string;
  affiliation: string;
  speakerId?: string;
  userId?: string;
}

export interface GongTranscriptSegment {
  speakerId: string;
  topic?: string;
  sentences: GongSentence[];
}

export interface GongSentence {
  start: number;
  end: number;
  text: string;
}

export interface GongTranscript {
  callId: string;
  transcript: GongTranscriptSegment[];
}

export interface GongUser {
  id: string;
  emailAddress: string;
  firstName: string;
  lastName: string;
  title?: string;
  phoneNumber?: string;
  extension?: string;
  active: boolean;
  created: string;
  settings?: {
    webConferencesRecorded: boolean;
  };
}

export interface GongListCallsResponse {
  requestId: string;
  records: {
    totalRecords: number;
    currentPageSize: number;
    currentPageNumber: number;
    cursor?: string;
  };
  calls: GongCall[];
}

export interface GongCallTranscriptsResponse {
  requestId: string;
  records: {
    totalRecords: number;
    currentPageSize: number;
    currentPageNumber: number;
    cursor?: string;
  };
  callTranscripts: GongTranscript[];
}

export interface GongListUsersResponse {
  requestId: string;
  records: {
    totalRecords: number;
    currentPageSize: number;
    currentPageNumber: number;
    cursor?: string;
  };
  users: GongUser[];
}

export interface GongClient {
  readonly connectorId: string;
  listCalls(params: {
    fromDateTime?: string;
    toDateTime?: string;
    cursor?: string;
  }): Promise<GongListCallsResponse>;
  getCallTranscripts(params: {
    callIds: string[];
    cursor?: string;
  }): Promise<GongCallTranscriptsResponse>;
  listUsers(params: { cursor?: string }): Promise<GongListUsersResponse>;
  healthCheck(): Promise<boolean>;
}

export function createGongClient(config: GongClientConfig): GongClient {
  const {
    connectorId,
    accessKey,
    accessKeySecret,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  const authHeader = `Basic ${btoa(`${accessKey}:${accessKeySecret}`)}`;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "gong",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "gong",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new GongApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    attempt = 0
  ): Promise<T> {
    await checkRateLimit();

    const url = `${BASE_URL}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = {
      Authorization: authHeader,
      "Content-Type": "application/json",
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401 || response.status === 403) {
      throw new GongApiError({
        message: "Invalid Gong API credentials",
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
        logger.warn(
          { connectorId, attempt, delay },
          "Gong API rate limited, retrying"
        );
        await sleep(delay);
        return request(method, path, body, attempt + 1);
      }
      throw new GongApiError({
        message: "Rate limited by Gong API",
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
          { connectorId, status: response.status, attempt, delay },
          "Gong API server error, retrying"
        );
        await sleep(delay);
        return request(method, path, body, attempt + 1);
      }
      throw new GongApiError({
        message: `Gong API server error: ${response.status}`,
        code: "SERVER_ERROR",
        retryable: true,
      });
    }

    if (!response.ok) {
      const respBody = await response.text();
      throw new GongApiError({
        message: `Gong API ${response.status}: ${respBody}`,
        code: "API_ERROR",
        retryable: false,
      });
    }

    return response.json() as Promise<T>;
  }

  function listCalls(params: {
    fromDateTime?: string;
    toDateTime?: string;
    cursor?: string;
  }): Promise<GongListCallsResponse> {
    const body: Record<string, unknown> = {};
    const filter: Record<string, string> = {};

    if (params.fromDateTime) {
      filter.fromDateTime = params.fromDateTime;
    }
    if (params.toDateTime) {
      filter.toDateTime = params.toDateTime;
    }

    if (Object.keys(filter).length > 0) {
      body.filter = filter;
    }
    if (params.cursor) {
      body.cursor = params.cursor;
    }

    return request<GongListCallsResponse>("POST", "/calls/extensive", body);
  }

  function getCallTranscripts(params: {
    callIds: string[];
    cursor?: string;
  }): Promise<GongCallTranscriptsResponse> {
    const body: Record<string, unknown> = {
      filter: { callIds: params.callIds },
    };
    if (params.cursor) {
      body.cursor = params.cursor;
    }

    return request<GongCallTranscriptsResponse>(
      "POST",
      "/calls/transcript",
      body
    );
  }

  function listUsers(params: {
    cursor?: string;
  }): Promise<GongListUsersResponse> {
    const query = params.cursor ? `?cursor=${params.cursor}` : "";
    return request<GongListUsersResponse>("GET", `/users${query}`);
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await listUsers({});
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    listCalls,
    getCallTranscripts,
    listUsers,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
