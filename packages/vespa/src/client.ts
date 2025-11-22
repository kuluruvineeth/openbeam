import type {
  Entity,
  FeedResponse,
  GenericDocument,
  QueryParams,
  SearchResult,
  VespaError,
} from "./schemas";

/**
 * Vespa HTTP client
 * Provides methods for feeding documents and querying
 */
export class VespaClient {
  private readonly baseUrl: string;
  private readonly documentApiUrl: string;
  private readonly searchApiUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.VESPA_URL || "http://localhost:8080";
    this.documentApiUrl = `${this.baseUrl}/document/v1`;
    this.searchApiUrl = `${this.baseUrl}/search/`;
  }

  /**
   * Check if an error is a retryable connection error
   */
  private isRetryableError(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as { code?: string })?.code;
    const isAbortError = error instanceof Error && error.name === "AbortError";

    return (
      errorCode === "ECONNRESET" ||
      errorMessage.includes("ECONNRESET") ||
      errorMessage.includes("socket") ||
      errorMessage.includes("connection") ||
      errorMessage.includes("closed unexpectedly") ||
      isAbortError
    );
  }

  /**
   * Extract error message from a failed response
   */
  private async getResponseError(response: Response): Promise<string> {
    try {
      const error = (await response.json()) as VespaError;
      return error.message || response.statusText;
    } catch {
      return response.statusText;
    }
  }

  /**
   * Feed a single document to Vespa with retry logic
   */
  async feedDocument(doc: GenericDocument, retries = 3): Promise<FeedResponse> {
    const documentPath = `${this.documentApiUrl}/default/openplane_document/docid/${doc.id}`;

    // Prepare document for Vespa - stringify metadata if it's an object
    // Vespa's json type field expects a JSON string, not an object
    const docForVespa: Record<string, unknown> = { ...doc };
    if (docForVespa.metadata && typeof docForVespa.metadata === "object") {
      docForVespa.metadata = JSON.stringify(docForVespa.metadata);
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(documentPath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields: docForVespa }),
          signal: AbortSignal.timeout(30_000),
        });

        if (!response.ok) {
          const errorMessage = await this.getResponseError(response);
          throw new Error(`Vespa feed error: ${errorMessage}`);
        }

        return (await response.json()) as FeedResponse;
      } catch (error: unknown) {
        const shouldRetry = this.isRetryableError(error) && attempt < retries;

        if (shouldRetry) {
          const delay = 2 ** attempt * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw new Error("Failed to feed document after retries");
  }

  /**
   * Feed multiple documents in batch
   */
  async feedBatch(docs: GenericDocument[]): Promise<FeedResponse[]> {
    const results: FeedResponse[] = [];

    // Process in manageable chunks, but isolate failures per document
    const batchSize = 10;
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (doc) => {
          try {
            const response = await this.feedDocument(doc);
            return response;
          } catch (error) {
            console.error("Vespa document feed failure:", {
              error,
              docId: doc.id,
            });
            throw error;
          }
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        }
      }
    }

    return results;
  }

  /**
   * Feed an entity (user, channel, group, etc.)
   */
  async feedEntity(entity: Entity): Promise<FeedResponse> {
    const documentPath = `${this.documentApiUrl}/default/entity/docid/${entity.id}`;

    const response = await fetch(documentPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: entity }),
    });

    if (!response.ok) {
      const error = (await response.json()) as VespaError;
      throw new Error(
        `Vespa feed error: ${error.message || response.statusText}`
      );
    }

    return (await response.json()) as FeedResponse;
  }

  /**
   * Query Vespa
   */
  async query<T = GenericDocument>(
    params: QueryParams
  ): Promise<SearchResult<T>> {
    const queryParams = new URLSearchParams();
    queryParams.set("yql", params.yql);

    if (params.ranking) {
      queryParams.set("ranking", params.ranking);
    }
    if (params.hits) {
      queryParams.set("hits", params.hits.toString());
    }
    if (params.offset) {
      queryParams.set("offset", params.offset.toString());
    }
    if (params.timeout) {
      queryParams.set("timeout", params.timeout);
    }

    const response = await fetch(`${this.searchApiUrl}?${queryParams}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = (await response.json()) as VespaError;
      throw new Error(
        `Vespa query error: ${error.message || response.statusText}`
      );
    }

    return (await response.json()) as SearchResult<T>;
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<void> {
    const documentPath = `${this.documentApiUrl}/default/openplane_document/docid/${id}`;

    const response = await fetch(documentPath, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = (await response.json()) as VespaError;
      throw new Error(
        `Vespa delete error: ${error.message || response.statusText}`
      );
    }
  }

  /**
   * Update a document (partial update)
   */
  async updateDocument(
    id: string,
    fields: Partial<GenericDocument>
  ): Promise<FeedResponse> {
    const documentPath = `${this.documentApiUrl}/default/openplane_document/docid/${id}`;

    const response = await fetch(documentPath, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const error = (await response.json()) as VespaError;
      throw new Error(
        `Vespa update error: ${error.message || response.statusText}`
      );
    }

    return (await response.json()) as FeedResponse;
  }

  /**
   * Get a document by ID
   */
  async getDocument(id: string): Promise<GenericDocument | null> {
    const documentPath = `${this.documentApiUrl}/default/openplane_document/docid/${id}`;

    const response = await fetch(documentPath, {
      method: "GET",
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = (await response.json()) as VespaError;
      throw new Error(
        `Vespa get error: ${error.message || response.statusText}`
      );
    }

    const result = (await response.json()) as { fields: GenericDocument };
    return result.fields;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/ApplicationStatus`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const vespaClient = new VespaClient();
