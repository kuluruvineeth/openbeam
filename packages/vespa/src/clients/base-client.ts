/**
 * Base Vespa Client
 *
 * Foundation for all Vespa operations with retry logic, error handling,
 * and health monitoring.
 */

import type {
  PaginatedResult,
  VespaError,
  VespaFeedResponse,
  VespaHit,
  VespaSearchResult,
} from "../types";

export interface VespaClientConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface FeedOptions {
  create?: boolean;
  update?: boolean;
  condition?: string;
}

export interface DocumentTarget {
  schema: string;
  namespace: string;
  docId: string;
}

export class BaseVespaClient {
  protected readonly baseUrl: string;
  protected readonly documentApiUrl: string;
  protected readonly searchApiUrl: string;
  protected readonly timeout: number;
  protected readonly retries: number;
  protected readonly retryDelay: number;

  constructor(config: VespaClientConfig = {}) {
    this.baseUrl =
      config.baseUrl || process.env.VESPA_URL || "http://localhost:8080";
    this.documentApiUrl = `${this.baseUrl}/document/v1`;
    this.searchApiUrl = `${this.baseUrl}/search/`;
    this.timeout = config.timeout || 30_000;
    this.retries = config.retries || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  // === Error Handling ===

  protected isRetryableError(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as { code?: string })?.code;
    const isAbortError = error instanceof Error && error.name === "AbortError";

    return (
      errorCode === "ECONNRESET" ||
      errorCode === "ECONNREFUSED" ||
      errorCode === "ETIMEDOUT" ||
      errorMessage.includes("ECONNRESET") ||
      errorMessage.includes("socket") ||
      errorMessage.includes("connection") ||
      errorMessage.includes("closed unexpectedly") ||
      errorMessage.includes("network") ||
      isAbortError
    );
  }

  protected async getResponseError(response: Response): Promise<string> {
    try {
      const error = (await response.json()) as VespaError;
      return error.message || response.statusText;
    } catch {
      return response.statusText;
    }
  }

  // === Retry Logic ===

  protected async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const shouldRetry =
          this.isRetryableError(error) && attempt < this.retries;

        if (shouldRetry) {
          const delay = Math.min(2 ** attempt * this.retryDelay, 10_000);
          await this.sleep(delay);
          continue;
        }

        throw lastError;
      }
    }

    throw (
      lastError ||
      new Error(`${operationName} failed after ${this.retries} retries`)
    );
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // === Document Operations ===

  protected async feedToSchema<T extends Record<string, unknown>>(
    target: DocumentTarget,
    fields: T,
    options: FeedOptions = {}
  ): Promise<VespaFeedResponse> {
    const { schema, namespace, docId } = target;
    const documentPath = `${this.documentApiUrl}/${namespace}/${schema}/docid/${docId}`;

    // Prepare fields for Vespa (serialize metadata objects to JSON)
    const vespaFields: Record<string, unknown> = { ...fields };
    if (vespaFields.metadata && typeof vespaFields.metadata === "object") {
      vespaFields.metadata = JSON.stringify(vespaFields.metadata);
    }
    if (vespaFields.properties && typeof vespaFields.properties === "object") {
      vespaFields.properties = JSON.stringify(vespaFields.properties);
    }
    if (
      vespaFields.social_links &&
      typeof vespaFields.social_links === "object"
    ) {
      vespaFields.social_links = JSON.stringify(vespaFields.social_links);
    }
    if (vespaFields.reactions && typeof vespaFields.reactions === "object") {
      vespaFields.reactions = JSON.stringify(vespaFields.reactions);
    }

    return await this.withRetry(async () => {
      const response = await fetch(documentPath, {
        method: options.create === false ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: vespaFields,
          ...(options.condition && { condition: options.condition }),
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorMessage = await this.getResponseError(response);
        throw new Error(
          `Vespa feed error (${response.status}): ${errorMessage}`
        );
      }

      return (await response.json()) as VespaFeedResponse;
    }, `feed ${schema}/${docId}`);
  }

  protected async getFromSchema<T>(
    schema: string,
    namespace: string,
    docId: string
  ): Promise<T | null> {
    const documentPath = `${this.documentApiUrl}/${namespace}/${schema}/docid/${docId}`;

    const response = await fetch(documentPath, {
      method: "GET",
      signal: AbortSignal.timeout(this.timeout),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorMessage = await this.getResponseError(response);
      throw new Error(`Vespa get error (${response.status}): ${errorMessage}`);
    }

    const result = (await response.json()) as { fields: T };
    return result.fields;
  }

  protected async updateInSchema<T extends Record<string, unknown>>(
    schema: string,
    namespace: string,
    docId: string,
    fields: Partial<T>
  ): Promise<VespaFeedResponse> {
    const documentPath = `${this.documentApiUrl}/${namespace}/${schema}/docid/${docId}`;

    // Prepare update fields
    const updateFields: Record<string, { assign: unknown }> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updateFields[key] = { assign: value };
      }
    }

    return await this.withRetry(async () => {
      const response = await fetch(documentPath, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: updateFields }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorMessage = await this.getResponseError(response);
        throw new Error(
          `Vespa update error (${response.status}): ${errorMessage}`
        );
      }

      return (await response.json()) as VespaFeedResponse;
    }, `update ${schema}/${docId}`);
  }

  protected async deleteFromSchema(
    schema: string,
    namespace: string,
    docId: string
  ): Promise<void> {
    const documentPath = `${this.documentApiUrl}/${namespace}/${schema}/docid/${docId}`;

    const response = await fetch(documentPath, {
      method: "DELETE",
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok && response.status !== 404) {
      const errorMessage = await this.getResponseError(response);
      throw new Error(
        `Vespa delete error (${response.status}): ${errorMessage}`
      );
    }
  }

  // === Query Operations ===

  protected async query<T>(
    yql: string,
    options: {
      ranking?: string;
      hits?: number;
      offset?: number;
      timeout?: string;
      queryFeatures?: Record<string, unknown>;
    } = {}
  ): Promise<VespaSearchResult<T>> {
    const queryParams = new URLSearchParams();
    queryParams.set("yql", yql);

    if (options.ranking) {
      queryParams.set("ranking", options.ranking);
    }
    if (options.hits !== undefined) {
      queryParams.set("hits", options.hits.toString());
    }
    if (options.offset !== undefined) {
      queryParams.set("offset", options.offset.toString());
    }
    if (options.timeout) {
      queryParams.set("timeout", options.timeout);
    }

    // Add query features (for embeddings, etc.)
    if (options.queryFeatures) {
      for (const [key, value] of Object.entries(options.queryFeatures)) {
        if (key.startsWith("input.query")) {
          queryParams.set(key, JSON.stringify(value));
        } else {
          queryParams.set(`ranking.features.${key}`, JSON.stringify(value));
        }
      }
    }

    const response = await fetch(`${this.searchApiUrl}?${queryParams}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorMessage = await this.getResponseError(response);
      throw new Error(
        `Vespa query error (${response.status}): ${errorMessage}`
      );
    }

    return (await response.json()) as VespaSearchResult<T>;
  }

  // === Health Check ===

  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/ApplicationStatus`, {
        signal: AbortSignal.timeout(5000),
      });
      return {
        healthy: response.ok,
        latencyMs: Date.now() - start,
      };
    } catch {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
      };
    }
  }

  async isHealthy(): Promise<boolean> {
    const { healthy } = await this.healthCheck();
    return healthy;
  }

  // === Shared Utilities ===

  /**
   * Escape special characters for YQL queries
   */
  protected escape(str: string): string {
    return str.replace(/["\\]/g, "\\$&");
  }

  /**
   * Generic batch feed operation with concurrency control
   */
  protected async feedBatchItems<T extends { id: string }>(
    items: T[],
    feedFn: (item: T) => Promise<VespaFeedResponse>,
    options: {
      concurrency?: number;
      onProgress?: (indexed: number, total: number) => void;
    } = {}
  ): Promise<{
    indexed: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const { concurrency = 10, onProgress } = options;
    const result = {
      indexed: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: string }>,
    };

    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const results = await Promise.allSettled(batch.map(feedFn));

      this.processBatchResults(results, batch, result);
      onProgress?.(result.indexed + result.failed, items.length);
    }

    return result;
  }

  private processBatchResults<T extends { id: string }>(
    results: PromiseSettledResult<VespaFeedResponse>[],
    batch: T[],
    result: {
      indexed: number;
      failed: number;
      errors: Array<{ id: string; error: string }>;
    }
  ): void {
    for (let j = 0; j < results.length; j++) {
      const res = results[j];
      const batchItem = batch[j];

      if (res?.status === "fulfilled") {
        result.indexed += 1;
      } else if (res?.status === "rejected" && batchItem) {
        result.failed += 1;
        result.errors.push({
          id: batchItem.id,
          error:
            res.reason instanceof Error
              ? res.reason.message
              : String(res.reason),
        });
      }
    }
  }

  /**
   * Build a paginated result from Vespa search response
   */
  protected buildPaginatedResult<T>(
    result: VespaSearchResult<T>,
    options: { offset?: number; limit?: number }
  ): PaginatedResult<VespaHit<T>> {
    const items = result.root.children || [];
    const total = result.root.fields.totalCount;
    const offset = options.offset || 0;
    const limit = options.limit || 20;

    return {
      items,
      total,
      hasMore: offset + items.length < total,
      offset,
      limit,
    };
  }
}
