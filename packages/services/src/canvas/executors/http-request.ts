import {
  type HttpAuthConfig,
  type HttpRequestNodeConfig,
  HttpRequestNodeConfigSchema,
  type KeyValuePair,
} from "@openbeam/types/canvas";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

type BinaryBody = {
  base64: string;
  sizeBytes: number;
  mediaType?: string;
};

type HttpRequestOutput = {
  status: number;
  statusText: string;
  ok: boolean;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  contentType?: string;
  durationMs: number;
  error?: string;
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const TEXT_CONTENT_TYPES = [
  "application/json",
  "application/xml",
  "application/xhtml+xml",
  "application/javascript",
  "application/x-www-form-urlencoded",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toEnabledPairs(pairs: KeyValuePair[]): KeyValuePair[] {
  return pairs.filter((pair) => pair.enabled && pair.key.trim());
}

function buildHeaders(pairs: KeyValuePair[]): Headers {
  const headers = new Headers();
  for (const pair of toEnabledPairs(pairs)) {
    headers.append(pair.key, pair.value);
  }
  return headers;
}

function setHeaderIfMissing(
  headers: Headers,
  name: string,
  value: string
): void {
  if (!headers.has(name)) {
    headers.set(name, value);
  }
}

function appendQueryParams(url: URL, pairs: KeyValuePair[]): void {
  for (const pair of toEnabledPairs(pairs)) {
    url.searchParams.append(pair.key, pair.value);
  }
}

function toHeadersRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

function decodeBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function stringifyValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function resolveFormPairs(
  pairs: KeyValuePair[] | undefined,
  input: unknown
): KeyValuePair[] {
  if (pairs && pairs.length > 0) {
    return pairs;
  }
  if (!isRecord(input)) {
    return [];
  }
  return Object.entries(input).map(([key, value]) => ({
    key,
    value: stringifyValue(value),
    enabled: true,
  }));
}

function resolveJsonBody(
  bodyContent: string | undefined,
  input: unknown
): string | undefined {
  let payload = bodyContent;
  if (payload === undefined && input !== undefined) {
    payload = typeof input === "string" ? input : JSON.stringify(input);
  }
  if (payload === undefined) {
    return;
  }
  const trimmed = payload.trim();
  if (!trimmed) {
    return;
  }
  JSON.parse(trimmed);
  return trimmed;
}

function resolveRawBody(
  bodyContent: string | undefined,
  input: unknown
): string | undefined {
  if (bodyContent !== undefined) {
    return bodyContent;
  }
  if (input === undefined) {
    return;
  }
  if (typeof input === "string") {
    return input;
  }
  return JSON.stringify(input);
}

function resolveBinaryBody(
  bodyContent: string | undefined,
  input: unknown
): Uint8Array | undefined {
  if (bodyContent !== undefined) {
    return decodeBase64(bodyContent);
  }
  if (input instanceof Uint8Array) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (typeof input === "string") {
    return decodeBase64(input);
  }
  return;
}

function isJsonContentType(contentType: string | undefined): boolean {
  if (!contentType) {
    return false;
  }
  const normalized = contentType.toLowerCase();
  return (
    normalized.includes("application/json") || normalized.endsWith("+json")
  );
}

function isTextContentType(contentType: string | undefined): boolean {
  if (!contentType) {
    return false;
  }
  const normalized = contentType.toLowerCase();
  if (normalized.startsWith("text/")) {
    return true;
  }
  return TEXT_CONTENT_TYPES.some((type) => normalized.includes(type));
}

function toBinaryBody(buffer: ArrayBuffer, mediaType?: string): BinaryBody {
  const bytes = new Uint8Array(buffer);
  return {
    base64: Buffer.from(bytes).toString("base64"),
    sizeBytes: bytes.length,
    mediaType,
  };
}

function stripBodyHeaders(headers: Headers): Headers {
  const next = new Headers(headers);
  next.delete("content-type");
  next.delete("content-length");
  return next;
}

function adjustRequestForRedirect(
  init: RequestInit,
  status: number
): RequestInit {
  const method = (init.method ?? "GET").toUpperCase();
  if (status === 303 && method !== "GET" && method !== "HEAD") {
    return {
      ...init,
      method: "GET",
      body: undefined,
      headers: init.headers
        ? stripBodyHeaders(new Headers(init.headers))
        : init.headers,
    };
  }
  if ((status === 301 || status === 302) && method === "POST") {
    return {
      ...init,
      method: "GET",
      body: undefined,
      headers: init.headers
        ? stripBodyHeaders(new Headers(init.headers))
        : init.headers,
    };
  }
  return init;
}

function removeSensitiveHeaders(headers: Headers): Headers {
  const next = new Headers(headers);
  next.delete("authorization");
  return next;
}

function normalizeUrl(value: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new Error("Invalid URL");
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRedirects(params: {
  url: URL;
  init: RequestInit;
  timeoutMs: number;
  followRedirects: boolean;
  maxRedirects: number;
}): Promise<Response> {
  const { timeoutMs } = params;
  let currentUrl = params.url;
  let requestInit = params.init;
  let redirectCount = 0;
  const allowRedirects = params.followRedirects && params.maxRedirects > 0;

  while (true) {
    const response = await fetchWithTimeout(
      currentUrl,
      { ...requestInit, redirect: "manual" },
      timeoutMs
    );

    if (!(allowRedirects && REDIRECT_STATUSES.has(response.status))) {
      return response;
    }

    if (redirectCount >= params.maxRedirects) {
      throw new Error("Redirect limit exceeded");
    }

    const location = response.headers.get("location");
    if (!location) {
      return response;
    }

    const nextUrl = new URL(location, currentUrl);
    const nextInit = adjustRequestForRedirect(requestInit, response.status);
    const nextHeaders = nextInit.headers
      ? new Headers(nextInit.headers)
      : new Headers();
    if (currentUrl.origin !== nextUrl.origin) {
      requestInit = {
        ...nextInit,
        headers: removeSensitiveHeaders(nextHeaders),
      };
    } else {
      requestInit = { ...nextInit, headers: nextHeaders };
    }

    currentUrl = nextUrl;
    redirectCount += 1;
  }
}

async function fetchWithRetry(params: {
  url: URL;
  init: RequestInit;
  timeoutMs: number;
  retry: HttpRequestNodeConfig["retry"];
  followRedirects: boolean;
  maxRedirects: number;
}): Promise<Response> {
  const { retry } = params;
  const maxAttempts = retry.enabled ? retry.maxAttempts : 1;
  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const response = await fetchWithRedirects({
        url: params.url,
        init: params.init,
        timeoutMs: params.timeoutMs,
        followRedirects: params.followRedirects,
        maxRedirects: params.maxRedirects,
      });
      if (
        retry.enabled &&
        retry.retryOn.includes(response.status) &&
        attempt < maxAttempts
      ) {
        await delay(retry.backoffMs);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (!retry.enabled || attempt >= maxAttempts) {
        throw error;
      }
      await delay(retry.backoffMs);
    }
  }

  throw lastError ?? new Error("Request failed");
}

async function fetchOAuthToken(
  auth: HttpAuthConfig,
  timeoutMs: number
): Promise<string> {
  if (auth.token?.trim()) {
    return auth.token.trim();
  }
  if (!auth.oauth2TokenUrl?.trim()) {
    throw new Error("OAuth2 token URL is required");
  }
  if (!auth.oauth2ClientId?.trim()) {
    throw new Error("OAuth2 client ID is required");
  }

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", auth.oauth2ClientId.trim());
  if (auth.oauth2ClientSecret) {
    body.set("client_secret", auth.oauth2ClientSecret);
  }
  if (auth.oauth2Scopes?.trim()) {
    body.set("scope", auth.oauth2Scopes.trim());
  }

  const headers = new Headers();
  headers.set("content-type", "application/x-www-form-urlencoded");

  if (auth.oauth2ClientSecret) {
    const encoded = Buffer.from(
      `${auth.oauth2ClientId}:${auth.oauth2ClientSecret}`
    ).toString("base64");
    headers.set("authorization", `Basic ${encoded}`);
  }

  const response = await fetchWithTimeout(
    normalizeUrl(auth.oauth2TokenUrl),
    { method: "POST", headers, body },
    timeoutMs
  );
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`OAuth2 token request failed (${response.status})`);
  }

  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("OAuth2 token response is not valid JSON");
  }

  if (!isRecord(parsed) || typeof parsed.access_token !== "string") {
    throw new Error("OAuth2 access token missing");
  }

  const token = parsed.access_token.trim();
  if (!token) {
    throw new Error("OAuth2 access token missing");
  }

  return token;
}

async function applyAuth(params: {
  auth: HttpAuthConfig;
  headers: Headers;
  url: URL;
  timeoutMs: number;
}): Promise<void> {
  const { auth, headers, url, timeoutMs } = params;
  switch (auth.type) {
    case "none":
      return;
    case "basic": {
      const username = auth.username?.trim();
      const password = auth.password ?? "";
      if (!username) {
        throw new Error("Basic auth username is required");
      }
      const encoded = Buffer.from(`${username}:${password}`).toString("base64");
      headers.set("authorization", `Basic ${encoded}`);
      return;
    }
    case "bearer": {
      const token = auth.token?.trim();
      if (!token) {
        throw new Error("Bearer token is required");
      }
      headers.set("authorization", `Bearer ${token}`);
      return;
    }
    case "api_key": {
      const key = auth.apiKeyName?.trim();
      const value = auth.apiKeyValue?.trim();
      if (!(key && value)) {
        throw new Error("API key name and value are required");
      }
      if (auth.apiKeyLocation === "query") {
        url.searchParams.append(key, value);
      } else {
        headers.set(key, value);
      }
      return;
    }
    case "oauth2": {
      const token = await fetchOAuthToken(auth, timeoutMs);
      headers.set("authorization", `Bearer ${token}`);
      return;
    }
    case "custom_header": {
      const key = auth.customHeaderName?.trim();
      const value = auth.customHeaderValue ?? "";
      if (!key) {
        throw new Error("Custom header name is required");
      }
      headers.set(key, value);
      return;
    }
    default:
      throw new Error("Unsupported auth type");
  }
}

function buildRequestBody(params: {
  config: HttpRequestNodeConfig;
  headers: Headers;
  input: unknown;
}): RequestInit["body"] | undefined {
  const { config, headers, input } = params;
  switch (config.bodyType) {
    case "none":
      return;
    case "json": {
      const payload = resolveJsonBody(config.bodyContent, input);
      if (payload === undefined) {
        return;
      }
      setHeaderIfMissing(headers, "content-type", "application/json");
      return payload;
    }
    case "form_urlencoded": {
      const pairs = resolveFormPairs(config.bodyFormFields, input);
      const searchParams = new URLSearchParams();
      for (const pair of toEnabledPairs(pairs)) {
        searchParams.append(pair.key, pair.value);
      }
      setHeaderIfMissing(
        headers,
        "content-type",
        "application/x-www-form-urlencoded"
      );
      return searchParams;
    }
    case "form_data": {
      const pairs = resolveFormPairs(config.bodyFormFields, input);
      const form = new FormData();
      for (const pair of toEnabledPairs(pairs)) {
        form.append(pair.key, pair.value);
      }
      return form;
    }
    case "raw": {
      const payload = resolveRawBody(config.bodyContent, input);
      if (payload === undefined) {
        return;
      }
      setHeaderIfMissing(headers, "content-type", "text/plain");
      return payload;
    }
    case "xml": {
      const payload = resolveRawBody(config.bodyContent, input);
      if (payload === undefined) {
        return;
      }
      setHeaderIfMissing(headers, "content-type", "application/xml");
      return payload;
    }
    case "binary": {
      const payload = resolveBinaryBody(config.bodyContent, input);
      if (!payload) {
        return;
      }
      setHeaderIfMissing(headers, "content-type", "application/octet-stream");
      return new Blob([payload as BlobPart]);
    }
    default:
      throw new Error("Unsupported body type");
  }
}

async function parseResponseBody(params: {
  response: Response;
  responseConfig: HttpRequestNodeConfig["response"];
}): Promise<unknown> {
  const { response, responseConfig } = params;
  const contentType = response.headers.get("content-type") ?? undefined;
  const responseType = responseConfig.responseType ?? "auto";
  const parseResponse = responseConfig.parseResponse ?? true;

  const jsonLike = isJsonContentType(contentType);
  const textLike = isTextContentType(contentType);
  const wantsBinary =
    responseType === "binary" ||
    responseType === "stream" ||
    (responseType === "auto" && !textLike);
  const wantsJson =
    responseType === "json" || (responseType === "auto" && jsonLike);

  if (wantsBinary) {
    const buffer = await response.arrayBuffer();
    return toBinaryBody(buffer, contentType);
  }

  const text = await response.text();
  if (!parseResponse) {
    return text;
  }

  if (wantsJson) {
    if (!text.trim()) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Response is not valid JSON");
    }
  }

  return text;
}

function buildErrorOutput(params: {
  config: HttpRequestNodeConfig;
  url: string;
  startedAt: number;
  message: string;
}): HttpRequestOutput {
  return {
    status: 0,
    statusText: "",
    ok: false,
    url: params.url,
    method: params.config.method,
    headers: {},
    body: null,
    durationMs: Date.now() - params.startedAt,
    error: params.message,
  };
}

export const httpRequestExecutor: CanvasNodeExecutor = async ({
  node,
  input,
}) => {
  let config: HttpRequestNodeConfig | null = null;
  const startedAt = Date.now();

  try {
    config = HttpRequestNodeConfigSchema.parse(resolveNodeConfig(node.data));
    if (!config.url.trim()) {
      throw new Error("URL is required");
    }

    const url = normalizeUrl(config.url.trim());
    appendQueryParams(url, config.queryParams);

    const headers = buildHeaders(config.headers);
    if (!config.response.validateCertificate) {
      throw new Error("Certificate validation cannot be disabled");
    }

    await applyAuth({
      auth: config.auth,
      headers,
      url,
      timeoutMs: config.timeoutMs,
    });

    const body = buildRequestBody({ config, headers, input });

    const response = await fetchWithRetry({
      url,
      init: {
        method: config.method,
        headers,
        body,
      },
      timeoutMs: config.timeoutMs,
      retry: config.retry,
      followRedirects: config.response.followRedirects,
      maxRedirects: config.response.maxRedirects,
    });

    const bodyValue = await parseResponseBody({
      response,
      responseConfig: config.response,
    });

    const output: HttpRequestOutput = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url || url.toString(),
      method: config.method,
      headers: toHeadersRecord(response.headers),
      body: bodyValue,
      contentType: response.headers.get("content-type") ?? undefined,
      durationMs: Date.now() - startedAt,
    };

    if (!response.ok) {
      const message = `HTTP ${response.status} ${response.statusText}`.trim();
      if (config.continueOnError) {
        return { ...output, error: message };
      }
      throw new Error(message);
    }

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (config?.continueOnError) {
      return buildErrorOutput({
        config,
        url: config.url,
        startedAt,
        message,
      });
    }
    throw new CanvasNodeExecutionError({
      nodeType: node.type,
      nodeId: node.id,
      message,
      cause: error,
    });
  }
};
