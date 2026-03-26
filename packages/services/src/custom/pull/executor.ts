import type {
  CustomPullSyncCursor,
  CustomPullTransformContext,
  EndpointDefinition,
  PullConnectorDefinition,
} from "@openbeam/types/services/connectors/custom-pull";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { ResolvedAuth } from "./auth-resolver";
import { resolveAuth } from "./auth-resolver";
import { resolveJsonPathArray } from "./jsonpath";
import { mapItemToDocument } from "./mapping";
import { createPaginator } from "./pagination";
import { CustomPullApiError } from "./types";

interface PullSyncBatch {
  items: GenericDocument[];
  cursor: CustomPullSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

const MIN_REQUEST_INTERVAL_MS = 100;

function buildEndpointUrl(
  baseUrl: string,
  endpointPath: string,
  queryParams: Record<string, string>,
  overrides: Record<string, string>
): string {
  const absoluteOverride = overrides.__absolute_url;
  if (absoluteOverride) {
    return absoluteOverride;
  }

  const url = new URL(endpointPath, baseUrl);
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (key !== "__absolute_url") {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

interface RequestParams {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
  timeoutMs: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  attempt?: number;
}

async function executeRequest(
  params: RequestParams
): Promise<{ body: Record<string, unknown>; headers: Headers }> {
  const {
    url,
    method,
    headers,
    body,
    timeoutMs,
    maxRetries,
    retryBaseDelayMs,
  } = params;
  const attempt = params.attempt ?? 0;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...headers,
      },
      body: method === "POST" ? body : undefined,
      signal: controller.signal,
    });

    if (response.status === 429) {
      const retryAfterRaw = response.headers.get("Retry-After");
      const retryAfterSeconds = retryAfterRaw ? Number(retryAfterRaw) : 10;
      const retryAfter = Number.isNaN(retryAfterSeconds)
        ? 10
        : retryAfterSeconds;

      if (attempt < maxRetries) {
        await sleep(retryAfter * 1000);
        return executeRequest({ ...params, attempt: attempt + 1 });
      }
      throw new CustomPullApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      throw new CustomPullApiError({
        message: `Authentication failed: ${response.status}`,
        statusCode: response.status,
        code: response.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        retryable: false,
      });
    }

    if (!response.ok) {
      const retryable = response.status >= 500;
      if (retryable && attempt < maxRetries) {
        const delayMs =
          retryBaseDelayMs * 2 ** attempt + Math.random() * retryBaseDelayMs;
        await sleep(delayMs);
        return executeRequest({ ...params, attempt: attempt + 1 });
      }
      throw new CustomPullApiError({
        message: `Request failed: ${response.status}`,
        statusCode: response.status,
        code: "SERVER_ERROR",
        retryable,
      });
    }

    const responseBody = (await response.json()) as Record<string, unknown>;
    return { body: responseBody, headers: response.headers };
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface SyncEndpointParams {
  definition: PullConnectorDefinition;
  endpoint: EndpointDefinition;
  ctx: CustomPullTransformContext;
  auth: ResolvedAuth;
  cursor: CustomPullSyncCursor;
  batchSize: number;
}

async function* syncEndpoint(
  params: SyncEndpointParams
): AsyncGenerator<{ documents: GenericDocument[]; errors: number }> {
  const { definition, endpoint, ctx, auth, cursor, batchSize } = params;
  const mergedHeaders = {
    ...definition.globalHeaders,
    ...auth.headers,
    ...endpoint.headers,
  };
  const mergedQueryParams = {
    ...auth.queryParams,
    ...endpoint.queryParams,
  };

  if (
    endpoint.incrementalParam &&
    endpoint.incrementalField &&
    cursor.endpointCursors?.[endpoint.id]?.lastValue
  ) {
    const endpointCursor = cursor.endpointCursors?.[endpoint.id];
    const lastValue = String(endpointCursor?.lastValue);
    mergedQueryParams[endpoint.incrementalParam] = lastValue;
  }

  const minIntervalMs = endpoint.rateLimitRequestsPerSecond
    ? Math.max(
        MIN_REQUEST_INTERVAL_MS,
        1000 / endpoint.rateLimitRequestsPerSecond
      )
    : MIN_REQUEST_INTERVAL_MS;

  let lastRequestTime = 0;

  const fetcher = async (overrides: Record<string, string>) => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < minIntervalMs) {
      await sleep(minIntervalMs - elapsed);
    }
    lastRequestTime = Date.now();

    const url = buildEndpointUrl(
      definition.baseUrl,
      endpoint.path,
      mergedQueryParams,
      overrides
    );

    return executeRequest({
      url,
      method: endpoint.method,
      headers: mergedHeaders,
      body: endpoint.bodyTemplate,
      timeoutMs: definition.requestTimeoutMs,
      maxRetries: definition.maxRetries,
      retryBaseDelayMs: definition.retryBaseDelayMs,
    });
  };

  const paginator = createPaginator(endpoint.pagination, fetcher);
  let documents: GenericDocument[] = [];
  let errors = 0;

  for await (const page of paginator) {
    const items = resolveJsonPathArray(page.body, endpoint.itemsPath);

    for (const item of items) {
      if (typeof item !== "object" || item === null) {
        errors += 1;
        continue;
      }

      try {
        const doc = mapItemToDocument(
          item as Record<string, unknown>,
          endpoint,
          ctx
        );
        documents.push(doc);
      } catch (error) {
        logger.error(
          { error, endpointId: endpoint.id, connectorId: ctx.connectorId },
          "Error mapping item to document in pull sync"
        );
        errors += 1;
      }

      if (documents.length >= batchSize) {
        yield { documents, errors };
        documents = [];
        errors = 0;
      }
    }
  }

  if (documents.length > 0 || errors > 0) {
    yield { documents, errors };
  }
}

export async function* executePullSync(
  definition: PullConnectorDefinition,
  ctx: CustomPullTransformContext,
  cursor: CustomPullSyncCursor
): AsyncGenerator<PullSyncBatch> {
  const auth = await resolveAuth(definition.auth);
  const batchSize = definition.defaultBatchSize;
  let totalProcessed = 0;
  const totalSkipped = 0;
  let totalErrors = 0;
  const endpointCursors: Record<string, Record<string, unknown>> = {
    ...(cursor.endpointCursors ?? {}),
  };

  for (const endpoint of definition.endpoints) {
    for await (const batch of syncEndpoint({
      definition,
      endpoint,
      ctx,
      auth,
      cursor,
      batchSize,
    })) {
      totalProcessed += batch.documents.length;
      totalErrors += batch.errors;

      const latestUpdated = findLatestTimestamp(batch.documents);
      if (latestUpdated && endpoint.incrementalField) {
        endpointCursors[endpoint.id] = {
          ...(endpointCursors[endpoint.id] ?? {}),
          lastValue: String(latestUpdated),
        };
      }

      const syncCursor: CustomPullSyncCursor = {
        lastSyncTime: Date.now(),
        lastFullSync: cursor.lastFullSync,
        endpointCursors,
      };

      yield {
        items: batch.documents,
        cursor: syncCursor,
        hasMore: true,
        stats: {
          processed: totalProcessed,
          skipped: totalSkipped,
          errors: totalErrors,
        },
      };
    }
  }

  const finalCursor: CustomPullSyncCursor = {
    lastSyncTime: Date.now(),
    lastFullSync: Date.now(),
    endpointCursors,
  };

  yield {
    items: [],
    cursor: finalCursor,
    hasMore: false,
    stats: {
      processed: totalProcessed,
      skipped: totalSkipped,
      errors: totalErrors,
    },
  };
}

function findLatestTimestamp(documents: GenericDocument[]): number | undefined {
  let latest: number | undefined;
  for (const doc of documents) {
    if (doc.updated_at > (latest ?? 0)) {
      latest = doc.updated_at;
    }
  }
  return latest;
}
