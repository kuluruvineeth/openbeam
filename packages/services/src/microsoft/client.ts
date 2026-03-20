import { logger } from "../lib/logger";
import { MicrosoftGraphApiError } from "./types";

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type MicrosoftGraphClientConfig = {
  connectorId: string;
  accessToken: string;
};

type GraphErrorBody = {
  error?: {
    message?: string;
    code?: string;
  };
};

type GraphPageResponse<T> = {
  value: T[];
  "@odata.nextLink"?: string;
};

type GraphDeltaResponse<T> = {
  value: T[];
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
};

export type MicrosoftGraphClient = {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  paginate<T>(
    path: string,
    params?: Record<string, string>
  ): AsyncGenerator<T[], void, undefined>;
  delta<T>(
    path: string,
    deltaLink?: string
  ): Promise<{ items: T[]; deltaLink?: string }>;
  deltaPages<T>(
    path: string,
    deltaLink?: string
  ): AsyncGenerator<{ items: T[]; deltaLink?: string }, void, undefined>;
};

export function createMicrosoftGraphClient(
  config: MicrosoftGraphClientConfig
): MicrosoftGraphClient {
  const { connectorId, accessToken } = config;

  function buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${GRAPH_BASE_URL}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  async function request<T>(url: string, attempt = 0): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "60",
        10
      );
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs = retryAfter * 1000;
        logger.warn(
          { connectorId, url, retryAfter, attempt },
          "Graph API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, attempt + 1);
      }
      throw new MicrosoftGraphApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "TooManyRequests",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      const body = (await response.json().catch(() => ({}))) as GraphErrorBody;
      throw new MicrosoftGraphApiError({
        message: body.error?.message ?? "Authentication failed",
        statusCode: response.status,
        code: body.error?.code ?? "AuthenticationError",
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as GraphErrorBody;
      const retryable = response.status >= 500;
      if (retryable && attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs =
          BASE_RETRY_DELAY_MS * 2 ** attempt +
          Math.random() * BASE_RETRY_DELAY_MS;
        logger.warn(
          { connectorId, url, statusCode: response.status, attempt },
          "Graph API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, attempt + 1);
      }
      throw new MicrosoftGraphApiError({
        message: body.error?.message ?? `Request failed: ${response.status}`,
        statusCode: response.status,
        code: body.error?.code ?? "UnknownError",
        retryable,
      });
    }

    return response.json() as Promise<T>;
  }

  function get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return request<T>(buildUrl(path, params));
  }

  async function* paginate<T>(
    path: string,
    params?: Record<string, string>
  ): AsyncGenerator<T[], void, undefined> {
    let url: string | undefined = buildUrl(path, params);

    while (url) {
      const page: GraphPageResponse<T> =
        await request<GraphPageResponse<T>>(url);

      if (page.value.length > 0) {
        yield page.value;
      }

      url = page["@odata.nextLink"];
    }
  }

  async function* deltaPages<T>(
    path: string,
    existingDeltaLink?: string
  ): AsyncGenerator<{ items: T[]; deltaLink?: string }, void, undefined> {
    let url: string | undefined =
      existingDeltaLink ??
      (() => {
        const u = new URL(`${GRAPH_BASE_URL}${path}`);
        u.searchParams.set("$top", "50");
        return u.toString();
      })();
    let currentDeltaLink: string | undefined;

    while (url) {
      const page: GraphDeltaResponse<T> =
        await request<GraphDeltaResponse<T>>(url);

      if (page["@odata.deltaLink"]) {
        currentDeltaLink = page["@odata.deltaLink"];
      }

      if (page.value.length > 0) {
        yield { items: page.value, deltaLink: currentDeltaLink };
      }

      url = page["@odata.nextLink"];
    }

    if (currentDeltaLink) {
      yield { items: [], deltaLink: currentDeltaLink };
    }
  }

  async function fetchDelta<T>(
    path: string,
    deltaLink?: string
  ): Promise<{ items: T[]; deltaLink?: string }> {
    const items: T[] = [];
    let finalDeltaLink: string | undefined;

    for await (const page of deltaPages<T>(path, deltaLink)) {
      items.push(...page.items);
      if (page.deltaLink) {
        finalDeltaLink = page.deltaLink;
      }
    }

    return { items, deltaLink: finalDeltaLink };
  }

  return {
    connectorId,
    get,
    paginate,
    delta: fetchDelta,
    deltaPages,
  };
}
