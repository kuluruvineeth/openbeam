import type {
  Entity,
  FeedResponse,
  GenericDocument,
  QueryParams,
  SearchResult,
  VespaError,
} from "./schemas";

export class VespaClient {
  private readonly baseUrl: string;
  private readonly documentApiUrl: string;
  private readonly searchApiUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.VESPA_URL || "http://localhost:8080";
    this.documentApiUrl = `${this.baseUrl}/document/v1`;
    this.searchApiUrl = `${this.baseUrl}/search/`;
  }

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

  private async getResponseError(response: Response): Promise<string> {
    try {
      const error = (await response.json()) as VespaError;
      return error.message || response.statusText;
    } catch {
      return response.statusText;
    }
  }

  async feedDocument(doc: GenericDocument, retries = 3): Promise<FeedResponse> {
    const documentPath = `${this.documentApiUrl}/default/openplane_document/docid/${doc.id}`;

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
          signal: AbortSignal.timeout(60_000),
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

  async feedBatch(docs: GenericDocument[]): Promise<FeedResponse[]> {
    const results: FeedResponse[] = [];

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

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: this is a complex query
  async query<T = GenericDocument>(
    params: QueryParams
  ): Promise<SearchResult<T>> {
    const hasVectorFeatures = !!params.query_embedding;

    if (hasVectorFeatures) {
      const body: Record<string, unknown> = {
        yql: params.yql,
        hits: params.hits || 20,
        offset: params.offset || 0,
      };

      if (params.ranking) {
        body.ranking = params.ranking;
      }
      if (params.timeout) {
        body.timeout = params.timeout;
      }

      if (params.query_embedding) {
        body["input.query(query_embedding)"] = params.query_embedding;
      }

      const response = await fetch(this.searchApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = (await response.json()) as VespaError;
        throw new Error(
          `Vespa query error: ${error.message || response.statusText}`
        );
      }

      return (await response.json()) as SearchResult<T>;
    }

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

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/ApplicationStatus`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const vespaClient = new VespaClient();
