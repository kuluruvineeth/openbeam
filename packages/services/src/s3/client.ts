import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type {
  S3ClientConfig,
  S3Region,
} from "@openbeam/types/services/connectors/s3";
import { logger } from "../lib/logger";
import { S3ApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 3000,
  requestsPerHour: 100_000,
  burstLimit: 50,
};

export interface S3Object {
  key: string;
  lastModified: string;
  etag: string;
  size: number;
  storageClass: string;
}

export interface S3ListObjectsResponse {
  objects: S3Object[];
  continuationToken?: string;
  isTruncated: boolean;
  keyCount: number;
}

export interface S3HeadObjectResponse {
  contentType: string;
  contentLength: number;
  lastModified: string;
  etag: string;
  storageClass?: string;
  metadata: Record<string, string>;
}

export interface S3Client {
  readonly connectorId: string;
  readonly region: S3Region;
  readonly bucketName: string;
  listObjects(params: {
    prefix?: string;
    maxKeys?: number;
    continuationToken?: string;
  }): Promise<S3ListObjectsResponse>;
  headObject(key: string): Promise<S3HeadObjectResponse | null>;
  healthCheck(): Promise<boolean>;
}

export function createS3Client(config: S3ClientConfig): S3Client {
  const {
    connectorId,
    accessKeyId,
    secretAccessKey,
    region,
    bucketName,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  const endpoint = `https://${bucketName}.s3.${region}.amazonaws.com`;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "s3",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "s3",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new S3ApiError({
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
    const service = "s3";
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

    headers["x-amz-date"] = amzDate;
    headers["x-amz-content-sha256"] = await sha256Hex(body);
    headers.host = url.hostname;

    const sortedHeaders = Object.keys(headers)
      .sort()
      .map((k) => `${k.toLowerCase()}:${headers[k]?.trim()}`);
    const signedHeadersList = Object.keys(headers)
      .sort()
      .map((k) => k.toLowerCase())
      .join(";");

    const bodyHash = headers["x-amz-content-sha256"];
    const canonicalQueryString = [...url.searchParams.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    const canonicalRequest = [
      method,
      url.pathname,
      canonicalQueryString,
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

  async function fetchS3(
    method: string,
    path: string,
    queryParams?: Record<string, string>,
    attempt = 0
  ): Promise<Response> {
    await checkRateLimit();

    const url = new URL(`${endpoint}${path}`);
    if (queryParams) {
      for (const [k, v] of Object.entries(queryParams)) {
        if (v !== undefined && v !== "") {
          url.searchParams.set(k, v);
        }
      }
    }

    const headers: Record<string, string> = {};
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
      throw new S3ApiError({
        message: "Invalid AWS credentials or insufficient S3 permissions",
        code: "UNAUTHORIZED",
        retryable: false,
      });
    }

    if (response.status === 404) {
      return response;
    }

    if (response.status === 429 || response.status === 503) {
      if (attempt < DEFAULT_RETRY_ATTEMPTS) {
        const delay = Math.min(
          BASE_RETRY_DELAY * 2 ** attempt,
          MAX_RETRY_DELAY
        );
        await sleep(delay);
        return fetchS3(method, path, queryParams, attempt + 1);
      }
      throw new S3ApiError({
        message: "Throttled by S3",
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
          "S3 API server error, retrying"
        );
        await sleep(delay);
        return fetchS3(method, path, queryParams, attempt + 1);
      }
      throw new S3ApiError({
        message: `S3 API ${response.status}: ${respBody}`,
        code: "API_ERROR",
        retryable: false,
      });
    }

    return response;
  }

  function parseXmlTag(xml: string, tag: string): string {
    const openTag = `<${tag}>`;
    const closeTag = `</${tag}>`;
    const start = xml.indexOf(openTag);
    if (start === -1) {
      return "";
    }
    const end = xml.indexOf(closeTag, start);
    if (end === -1) {
      return "";
    }
    return xml.slice(start + openTag.length, end);
  }

  function parseXmlTagAll(xml: string, tag: string): string[] {
    const results: string[] = [];
    const openTag = `<${tag}>`;
    const closeTag = `</${tag}>`;
    let searchFrom = 0;

    while (true) {
      const start = xml.indexOf(openTag, searchFrom);
      if (start === -1) {
        break;
      }
      const end = xml.indexOf(closeTag, start);
      if (end === -1) {
        break;
      }
      results.push(xml.slice(start + openTag.length, end));
      searchFrom = end + closeTag.length;
    }

    return results;
  }

  async function listObjects(params: {
    prefix?: string;
    maxKeys?: number;
    continuationToken?: string;
  }): Promise<S3ListObjectsResponse> {
    const queryParams: Record<string, string> = {
      "list-type": "2",
      "max-keys": String(params.maxKeys ?? 1000),
    };
    if (params.prefix) {
      queryParams.prefix = params.prefix;
    }
    if (params.continuationToken) {
      queryParams["continuation-token"] = params.continuationToken;
    }

    const response = await fetchS3("GET", "/", queryParams);
    const xml = await response.text();

    const isTruncated = parseXmlTag(xml, "IsTruncated") === "true";
    const nextToken = parseXmlTag(xml, "NextContinuationToken") || undefined;
    const keyCount = Number.parseInt(parseXmlTag(xml, "KeyCount") || "0", 10);

    const contentBlocks = parseXmlTagAll(xml, "Contents");
    const objects: S3Object[] = contentBlocks.map((block) => ({
      key: parseXmlTag(block, "Key"),
      lastModified: parseXmlTag(block, "LastModified"),
      etag: parseXmlTag(block, "ETag").replace(/"/g, ""),
      size: Number.parseInt(parseXmlTag(block, "Size") || "0", 10),
      storageClass: parseXmlTag(block, "StorageClass") || "STANDARD",
    }));

    return {
      objects,
      continuationToken: nextToken,
      isTruncated,
      keyCount,
    };
  }

  async function headObject(key: string): Promise<S3HeadObjectResponse | null> {
    const response = await fetchS3("HEAD", `/${encodeURIComponent(key)}`);
    if (response.status === 404) {
      return null;
    }

    const metadata: Record<string, string> = {};
    response.headers.forEach((value, headerKey) => {
      if (headerKey.startsWith("x-amz-meta-")) {
        metadata[headerKey.slice(11)] = value;
      }
    });

    return {
      contentType:
        response.headers.get("content-type") ?? "application/octet-stream",
      contentLength: Number.parseInt(
        response.headers.get("content-length") ?? "0",
        10
      ),
      lastModified: response.headers.get("last-modified") ?? "",
      etag: (response.headers.get("etag") ?? "").replace(/"/g, ""),
      storageClass: response.headers.get("x-amz-storage-class") ?? undefined,
      metadata,
    };
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await listObjects({ maxKeys: 1 });
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    region,
    bucketName,
    listObjects,
    headObject,
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
