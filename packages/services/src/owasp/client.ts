import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import { logger } from "../lib/logger";
import { OwaspApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com";

const RATE_LIMITS: RateLimitConfig = process.env.GITHUB_TOKEN
  ? { requestsPerMinute: 60, requestsPerHour: 4000, burstLimit: 20 }
  : { requestsPerMinute: 10, requestsPerHour: 55, burstLimit: 5 };

export interface OwaspClient {
  readonly connectorId: string;
  listDirectory(params: DirectoryParams): Promise<GitHubContentEntry[]>;
  fetchRawContent(params: RawContentParams): Promise<string>;
  healthCheck(): Promise<boolean>;
}

export interface DirectoryParams {
  owner: string;
  repo: string;
  path: string;
  branch: string;
}

export interface RawContentParams {
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
}

export interface GitHubContentEntry {
  name: string;
  path: string;
  sha: string;
  type: "file" | "dir";
  download_url: string | null;
}

interface ClientState {
  consecutiveErrors: number;
}

export function createOwaspClient(connectorId: string): OwaspClient {
  const state: ClientState = { consecutiveErrors: 0 };
  const githubToken = process.env.GITHUB_TOKEN;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "owasp",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "owasp",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new OwaspApiError({
          message: "GitHub API rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  function calculateRetryDelay(attempt: number, retryAfter?: number): number {
    if (retryAfter) {
      return retryAfter * 1000;
    }
    const exponentialDelay = BASE_RETRY_DELAY * 2 ** attempt;
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY);
  }

  async function fetchWithRetry(url: string, attempt = 0): Promise<Response> {
    await checkRateLimit();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
      };
      if (githubToken) {
        headers.Authorization = `Bearer ${githubToken}`;
      }

      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = OwaspApiError.fromResponse(
          response.status,
          `GitHub API error: ${response.status} ${response.statusText}`
        );

        if (error.retryable && attempt < DEFAULT_RETRY_ATTEMPTS) {
          await sleep(calculateRetryDelay(attempt, error.retryAfter));
          return fetchWithRetry(url, attempt + 1);
        }

        throw error;
      }

      state.consecutiveErrors = 0;
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      state.consecutiveErrors += 1;

      if (error instanceof OwaspApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        if (attempt < DEFAULT_RETRY_ATTEMPTS) {
          await sleep(calculateRetryDelay(attempt));
          return fetchWithRetry(url, attempt + 1);
        }
        throw new OwaspApiError({
          message: "Request timeout",
          code: "TIMEOUT",
          retryable: false,
        });
      }

      throw new OwaspApiError({
        message: `GitHub fetch failed: ${error instanceof Error ? error.message : String(error)}`,
        code: "FETCH_FAILED",
        retryable: false,
      });
    }
  }

  async function listDirectory(
    params: DirectoryParams
  ): Promise<GitHubContentEntry[]> {
    const url = `${GITHUB_API_BASE}/repos/${params.owner}/${params.repo}/contents/${params.path}?ref=${params.branch}`;
    const response = await fetchWithRetry(url);
    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new OwaspApiError({
        message: "Expected array from GitHub contents API",
        code: "PARSE_ERROR",
        retryable: false,
      });
    }

    return data as GitHubContentEntry[];
  }

  async function fetchRawContent(params: RawContentParams): Promise<string> {
    const url = `${GITHUB_RAW_BASE}/${params.owner}/${params.repo}/${params.branch}/${params.filePath}`;
    const response = await fetchWithRetry(url);
    return response.text();
  }

  async function healthCheck(): Promise<boolean> {
    try {
      const url = `${GITHUB_API_BASE}/repos/OWASP/Top10`;
      await fetchWithRetry(url);
      return true;
    } catch (error) {
      logger.debug({ error, connectorId }, "OWASP health check failed");
      return false;
    }
  }

  return {
    connectorId,
    listDirectory,
    fetchRawContent,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
