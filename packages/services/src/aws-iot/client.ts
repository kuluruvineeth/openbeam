import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type {
  AwsIotClientConfig,
  AwsIotRegion,
} from "@openbeam/types/services/connectors/aws-iot";
import { logger } from "../lib/logger";
import { AwsIotApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 300,
  requestsPerHour: 10_000,
  burstLimit: 10,
};

export interface AwsIotThing {
  thingName: string;
  thingArn: string;
  thingTypeName?: string;
  attributes?: Record<string, string>;
  version?: number;
}

export interface AwsIotThingDetail {
  thingName: string;
  thingArn: string;
  thingTypeName?: string;
  thingId?: string;
  attributes?: Record<string, string>;
  version?: number;
  defaultClientId?: string;
  billingGroupName?: string;
}

export interface AwsIotThingGroup {
  groupName: string;
  groupArn: string;
}

export interface AwsIotThingGroupDetail {
  groupName: string;
  groupArn: string;
  groupId?: string;
  version?: number;
  description?: string;
  parentGroupName?: string;
  rootToParentGroups?: { groupName: string; groupArn: string }[];
  attributes?: Record<string, string>;
  creationDate?: number;
}

export interface AwsIotShadow {
  state?: {
    reported?: Record<string, unknown>;
    desired?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  version?: number;
  timestamp?: number;
}

export interface AwsIotClient {
  readonly connectorId: string;
  readonly region: AwsIotRegion;
  listThings(params: {
    maxResults?: number;
    nextToken?: string;
  }): Promise<{ things: AwsIotThing[]; nextToken?: string }>;
  describeThing(thingName: string): Promise<AwsIotThingDetail>;
  listThingGroups(params: {
    maxResults?: number;
    nextToken?: string;
  }): Promise<{ thingGroups: AwsIotThingGroup[]; nextToken?: string }>;
  describeThingGroup(groupName: string): Promise<AwsIotThingGroupDetail>;
  getThingShadow(thingName: string): Promise<AwsIotShadow | null>;
  healthCheck(): Promise<boolean>;
}

export function createAwsIotClient(config: AwsIotClientConfig): AwsIotClient {
  const {
    connectorId,
    accessKeyId,
    secretAccessKey,
    region,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  const endpoint = `https://iot.${region}.amazonaws.com`;
  const dataEndpoint = `https://data-ats.iot.${region}.amazonaws.com`;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "aws-iot",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "aws-iot",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new AwsIotApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  function getAmzDate(): { amzDate: string; dateStamp: string } {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    return { amzDate, dateStamp };
  }

  async function sign(
    method: string,
    url: URL,
    headers: Record<string, string>,
    body: string
  ): Promise<Record<string, string>> {
    const { amzDate, dateStamp } = getAmzDate();
    const service = url.hostname.startsWith("data") ? "iotdata" : "iot";
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

    headers["x-amz-date"] = amzDate;
    headers.host = url.hostname;

    const sortedHeaders = Object.keys(headers)
      .sort()
      .map((k) => `${k.toLowerCase()}:${headers[k]?.trim()}`);
    const signedHeadersList = Object.keys(headers)
      .sort()
      .map((k) => k.toLowerCase())
      .join(";");

    const bodyHash = await sha256Hex(body);
    const canonicalRequest = [
      method,
      url.pathname,
      url.searchParams.toString(),
      `${sortedHeaders.join("\n")}\n`,
      signedHeadersList,
      bodyHash,
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      await sha256Hex(canonicalRequest),
    ].join("\n");

    const signingKey = await getSigningKey(dateStamp, region, service);
    const signature = await hmacHex(signingKey, stringToSign);

    headers.Authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersList}, Signature=${signature}`;

    return headers;
  }

  async function getSigningKey(
    dateStamp: string,
    regionStr: string,
    service: string
  ): Promise<ArrayBuffer> {
    const kDate = await hmacSign(`AWS4${secretAccessKey}`, dateStamp);
    const kRegion = await hmacSign(kDate, regionStr);
    const kService = await hmacSign(kRegion, service);
    return hmacSign(kService, "aws4_request");
  }

  async function fetchAwsJson<T>(params: {
    baseUrl: string;
    path: string;
    target: string;
    body: string;
    attempt?: number;
  }): Promise<T> {
    const { baseUrl, path, target, body, attempt = 0 } = params;
    await checkRateLimit();

    const url = new URL(`${baseUrl}${path}`);
    const headers: Record<string, string> = {
      "Content-Type": "application/x-amz-json-1.0",
      "X-Amz-Target": target,
    };

    const signedHeaders = await sign("POST", url, { ...headers }, body);
    Object.assign(headers, signedHeaders);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 403) {
      throw new AwsIotApiError({
        message: "Invalid AWS credentials or insufficient permissions",
        code: "UNAUTHORIZED",
        retryable: false,
      });
    }

    if (response.status === 429) {
      if (attempt < DEFAULT_RETRY_ATTEMPTS) {
        const delay = Math.min(
          BASE_RETRY_DELAY * 2 ** attempt,
          MAX_RETRY_DELAY
        );
        await sleep(delay);
        return fetchAwsJson<T>({
          baseUrl,
          path,
          target,
          body,
          attempt: attempt + 1,
        });
      }
      throw new AwsIotApiError({
        message: "Throttled by AWS IoT",
        code: "THROTTLED",
        retryable: true,
        retryAfter: 5,
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
          "AWS IoT API server error, retrying"
        );
        await sleep(delay);
        return fetchAwsJson<T>({
          baseUrl,
          path,
          target,
          body,
          attempt: attempt + 1,
        });
      }
      throw new AwsIotApiError({
        message: `AWS IoT API ${response.status}: ${respBody}`,
        code: "API_ERROR",
        retryable: false,
      });
    }

    return response.json() as Promise<T>;
  }

  async function fetchAwsRest<T>(
    baseUrl: string,
    method: string,
    path: string,
    attempt = 0
  ): Promise<T> {
    await checkRateLimit();

    const url = new URL(`${baseUrl}${path}`);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const signedHeaders = await sign(method, url, { ...headers }, "");
    Object.assign(headers, signedHeaders);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 403) {
      throw new AwsIotApiError({
        message: "Invalid AWS credentials or insufficient permissions",
        code: "UNAUTHORIZED",
        retryable: false,
      });
    }

    if (response.status === 404) {
      return null as T;
    }

    if (response.status === 429) {
      if (attempt < DEFAULT_RETRY_ATTEMPTS) {
        const delay = Math.min(
          BASE_RETRY_DELAY * 2 ** attempt,
          MAX_RETRY_DELAY
        );
        await sleep(delay);
        return fetchAwsRest<T>(baseUrl, method, path, attempt + 1);
      }
      throw new AwsIotApiError({
        message: "Throttled by AWS IoT",
        code: "THROTTLED",
        retryable: true,
        retryAfter: 5,
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
          "AWS IoT Data API server error, retrying"
        );
        await sleep(delay);
        return fetchAwsRest<T>(baseUrl, method, path, attempt + 1);
      }
      throw new AwsIotApiError({
        message: `AWS IoT Data API ${response.status}: ${respBody}`,
        code: "API_ERROR",
        retryable: false,
      });
    }

    return response.json() as Promise<T>;
  }

  async function listThings(params: {
    maxResults?: number;
    nextToken?: string;
  }): Promise<{ things: AwsIotThing[]; nextToken?: string }> {
    const body: Record<string, unknown> = {};
    if (params.maxResults) {
      body.maxResults = params.maxResults;
    }
    if (params.nextToken) {
      body.nextToken = params.nextToken;
    }

    const response = await fetchAwsJson<{
      things?: AwsIotThing[];
      nextToken?: string;
    }>({
      baseUrl: endpoint,
      path: "/",
      target: "IotSvc.ListThings",
      body: JSON.stringify(body),
    });

    return {
      things: response.things ?? [],
      nextToken: response.nextToken,
    };
  }

  function describeThing(thingName: string): Promise<AwsIotThingDetail> {
    return fetchAwsJson<AwsIotThingDetail>({
      baseUrl: endpoint,
      path: "/",
      target: "IotSvc.DescribeThing",
      body: JSON.stringify({ thingName }),
    });
  }

  async function listThingGroups(params: {
    maxResults?: number;
    nextToken?: string;
  }): Promise<{ thingGroups: AwsIotThingGroup[]; nextToken?: string }> {
    const body: Record<string, unknown> = {};
    if (params.maxResults) {
      body.maxResults = params.maxResults;
    }
    if (params.nextToken) {
      body.nextToken = params.nextToken;
    }

    const response = await fetchAwsJson<{
      thingGroups?: AwsIotThingGroup[];
      nextToken?: string;
    }>({
      baseUrl: endpoint,
      path: "/",
      target: "IotSvc.ListThingGroups",
      body: JSON.stringify(body),
    });

    return {
      thingGroups: response.thingGroups ?? [],
      nextToken: response.nextToken,
    };
  }

  function describeThingGroup(
    groupName: string
  ): Promise<AwsIotThingGroupDetail> {
    return fetchAwsJson<AwsIotThingGroupDetail>({
      baseUrl: endpoint,
      path: "/",
      target: "IotSvc.DescribeThingGroup",
      body: JSON.stringify({ thingGroupName: groupName }),
    });
  }

  function getThingShadow(thingName: string): Promise<AwsIotShadow | null> {
    return fetchAwsRest<AwsIotShadow | null>(
      dataEndpoint,
      "GET",
      `/things/${encodeURIComponent(thingName)}/shadow`
    );
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await listThings({ maxResults: 1 });
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    region,
    listThings,
    describeThing,
    listThingGroups,
    describeThingGroup,
    getThingShadow,
    healthCheck,
  };
}

async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return arrayBufferToHex(buffer);
}

async function hmacSign(
  key: string | ArrayBuffer,
  data: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyBuffer = typeof key === "string" ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
}

async function hmacHex(key: ArrayBuffer, data: string): Promise<string> {
  const buffer = await hmacSign(key, data);
  return arrayBufferToHex(buffer);
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
