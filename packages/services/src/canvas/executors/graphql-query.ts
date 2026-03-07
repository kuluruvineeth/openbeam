import {
  type GraphqlQueryNodeConfig,
  GraphqlQueryNodeConfigSchema,
  type HttpAuthConfig,
  type KeyValuePair,
} from "@openbeam/types/canvas";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

type GraphqlResponse = {
  data?: unknown;
  errors?: unknown;
  extensions?: unknown;
};

type GraphqlQueryOutput = {
  data: unknown;
  errors?: unknown;
  extensions?: unknown;
  raw: unknown;
  status: number;
  ok: boolean;
  url: string;
  method: string;
  headers: Record<string, string>;
  durationMs: number;
  error?: string;
};

const PATH_TOKEN_REGEX = /[^.[\]]+|\[(\d+)\]/g;

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

function toHeadersRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

function normalizeUrl(value: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new Error("Endpoint must be a valid URL");
  }
}

function parseJsonValue(value: string, label: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) {
    return;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
}

function normalizeVariables(
  value: unknown
): Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === "") {
    return;
  }
  if (typeof value === "string") {
    const parsed = parseJsonValue(value, "Variables");
    if (parsed === undefined) {
      return;
    }
    if (!isRecord(parsed)) {
      throw new Error("Variables must be a JSON object");
    }
    return parsed;
  }
  if (isRecord(value)) {
    return value;
  }
  throw new Error("Variables must be a JSON object");
}

function resolveVariables(
  config: GraphqlQueryNodeConfig,
  input: unknown
): Record<string, unknown> | undefined {
  const fromConfig = normalizeVariables(config.variables ?? "");
  const fromInput = normalizeVariables(input);
  if (fromConfig && fromInput) {
    return { ...fromConfig, ...fromInput };
  }
  return fromConfig ?? fromInput;
}

async function fetchWithTimeout(
  url: URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id =
    timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : 0;
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  } finally {
    if (id) {
      clearTimeout(id);
    }
  }
}

function readPath(value: unknown, path: string): unknown {
  const tokens: Array<string | number> = [];
  for (const match of path.matchAll(PATH_TOKEN_REGEX)) {
    if (match[1] !== undefined) {
      tokens.push(Number(match[1]));
    } else if (match[0]) {
      tokens.push(match[0]);
    }
  }

  let current: unknown = value;
  for (const token of tokens) {
    if (typeof token === "number") {
      if (!Array.isArray(current)) {
        return;
      }
      current = current[token];
      continue;
    }
    if (!isRecord(current)) {
      return;
    }
    current = current[token];
  }

  return current;
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

function buildErrorOutput(params: {
  config: GraphqlQueryNodeConfig;
  durationMs: number;
  error: string;
}): GraphqlQueryOutput {
  return {
    data: null,
    raw: null,
    status: 0,
    ok: false,
    url: params.config.endpoint ?? "",
    method: params.config.method ?? "POST",
    headers: {},
    durationMs: params.durationMs,
    error: params.error,
  };
}

export const graphqlQueryExecutor: CanvasNodeExecutor = async ({
  node,
  input,
}) => {
  const startedAt = Date.now();
  let config: GraphqlQueryNodeConfig | undefined;
  try {
    config = GraphqlQueryNodeConfigSchema.parse(resolveNodeConfig(node.data));
    if (!config.endpoint.trim()) {
      throw new Error("Endpoint is required");
    }
    if (!config.query.trim()) {
      throw new Error("Query is required");
    }
    if (config.method === "GET" && config.operationType !== "query") {
      throw new Error("GET only supports query operations");
    }

    const url = normalizeUrl(config.endpoint.trim());
    const headers = buildHeaders(config.headers);
    const variables = resolveVariables(config, input);
    const operationName = config.operationName?.trim() || undefined;

    if (config.method === "GET") {
      url.searchParams.set("query", config.query);
      if (variables) {
        url.searchParams.set("variables", JSON.stringify(variables));
      }
      if (operationName) {
        url.searchParams.set("operationName", operationName);
      }
    }

    await applyAuth({
      auth: config.auth,
      headers,
      url,
      timeoutMs: config.timeoutMs,
    });

    let body: string | undefined;
    if (config.method !== "GET") {
      const payload = {
        query: config.query,
        variables,
        operationName,
      };
      body = JSON.stringify(payload);
      setHeaderIfMissing(headers, "content-type", "application/json");
    }

    const response = await fetchWithTimeout(
      url,
      {
        method: config.method,
        headers,
        body,
        redirect: config.followRedirects ? "follow" : "manual",
      },
      config.timeoutMs
    );

    const rawText = await response.text();
    let parsed: unknown = rawText ? rawText : null;
    if (rawText) {
      parsed = parseJsonValue(rawText, "Response");
    }

    const responseBody: GraphqlResponse = isRecord(parsed) ? parsed : {};
    const data = responseBody.data;
    const errors = responseBody.errors;
    const extensions = responseBody.extensions;

    let resolvedData = data;
    if (config.responsePath?.trim()) {
      const extracted = readPath(data, config.responsePath.trim());
      if (extracted === undefined) {
        throw new Error("Response path not found");
      }
      resolvedData = extracted;
    }

    const output: GraphqlQueryOutput = {
      data: resolvedData,
      errors,
      extensions: config.includeExtensions ? extensions : undefined,
      raw: parsed,
      status: response.status,
      ok: response.ok,
      url: response.url || url.toString(),
      method: config.method,
      headers: toHeadersRecord(response.headers),
      durationMs: Date.now() - startedAt,
    };

    const hasGraphqlErrors =
      Array.isArray(errors) && errors.length > 0 && response.ok;

    if (!response.ok || hasGraphqlErrors) {
      const message = response.ok
        ? "GraphQL errors returned"
        : `HTTP ${response.status} ${response.statusText}`.trim();
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
        durationMs: Date.now() - startedAt,
        error: message,
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
