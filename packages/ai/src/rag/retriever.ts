/**
 * Retriever
 *
 * Retrieves relevant documents from Vespa for RAG.
 * Supports hybrid search, filtering, and access control.
 */

import {
  documentClient,
  type OpenPlaneDocument,
  type VespaHit,
  searchService as vespaSearchService,
} from "@openplane/vespa";
import { embeddingService } from "../embeddings";
import type { Embedding } from "../embeddings/types";
import type {
  RetrievalOptions,
  RetrievalResult,
  RetrievedDocument,
} from "./types";

/**
 * Default retrieval options
 */
const DEFAULT_OPTIONS: Required<
  Omit<
    RetrievalOptions,
    | "accessControl"
    | "connectorTypes"
    | "connectorIds"
    | "documentTypes"
    | "authorIds"
    | "sourceIds"
    | "dateRange"
  >
> = {
  topK: 10,
  minScore: 0.3,
  searchMode: "hybrid",
  rerank: true,
  rerankTopK: 5,
};

/**
 * Retriever class for fetching documents from Vespa
 */
export class Retriever {
  /**
   * Retrieve documents for a query
   */
  async retrieve(
    query: string,
    teamId: string,
    options: RetrievalOptions = {}
  ): Promise<RetrievalResult> {
    const startTime = Date.now();
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Generate query embedding for hybrid/semantic search
    let embedding: Embedding | undefined;
    if (opts.searchMode !== "keyword") {
      embedding = await embeddingService.embedQuery(query);
    }

    // Perform search based on mode
    let searchResult;
    const embeddingTime = Date.now() - startTime;
    const searchStart = Date.now();

    switch (opts.searchMode) {
      case "semantic":
        if (!embedding) {
          throw new Error("Embedding required for semantic search");
        }
        searchResult = await vespaSearchService.semanticSearch(
          embedding,
          teamId,
          {
            limit: opts.topK,
            accessControl: opts.accessControl,
          }
        );
        break;

      case "keyword":
        searchResult = await documentClient.textSearch(query, teamId, {
          limit: opts.topK,
          accessControl: opts.accessControl,
          connectorType: opts.connectorTypes?.[0],
          documentType: opts.documentTypes?.[0],
          dateRange: opts.dateRange,
        });
        break;

      case "hybrid":
      default:
        if (!embedding) {
          throw new Error("Embedding required for hybrid search");
        }
        searchResult = await vespaSearchService.hybridSearch(
          query,
          embedding,
          teamId,
          {
            limit: opts.topK,
            accessControl: opts.accessControl,
          }
        );
        break;
    }

    // Map Vespa results to RetrievedDocument
    const documents = this.mapVespaResults(searchResult.items || searchResult);

    // Filter by minimum score
    const filteredDocs = documents.filter(
      (doc) => doc.relevanceScore >= opts.minScore
    );

    return {
      documents: filteredDocs,
      query,
      embedding,
      searchTimeMs: Date.now() - searchStart,
      totalMatches: searchResult.total || documents.length,
    };
  }

  /**
   * Retrieve with pre-computed embedding
   */
  async retrieveWithEmbedding(
    query: string,
    embedding: Embedding,
    teamId: string,
    options: RetrievalOptions = {}
  ): Promise<RetrievalResult> {
    const startTime = Date.now();
    const opts = { ...DEFAULT_OPTIONS, ...options };

    const searchResult = await vespaSearchService.hybridSearch(
      query,
      embedding,
      teamId,
      {
        limit: opts.topK,
        accessControl: opts.accessControl,
      }
    );

    const documents = this.mapVespaResults(searchResult.items);

    const filteredDocs = documents.filter(
      (doc) => doc.relevanceScore >= opts.minScore
    );

    return {
      documents: filteredDocs,
      query,
      embedding,
      searchTimeMs: Date.now() - startTime,
      totalMatches: searchResult.total,
    };
  }

  /**
   * Retrieve similar documents to a given document
   */
  async retrieveSimilar(
    documentId: string,
    teamId: string,
    options: { limit?: number; accessControl?: string[] } = {}
  ): Promise<RetrievedDocument[]> {
    const results = await documentClient.getSimilar(documentId, teamId, {
      limit: options.limit || 5,
    });

    return this.mapVespaResults(results);
  }

  /**
   * Retrieve by document IDs
   */
  async retrieveByIds(
    documentIds: string[],
    teamId: string
  ): Promise<RetrievedDocument[]> {
    const documents: RetrievedDocument[] = [];

    for (const id of documentIds) {
      const doc = await documentClient.get(id);
      if (doc && doc.team_id === teamId) {
        documents.push(this.mapVespaDocument(doc, 1.0));
      }
    }

    return documents;
  }

  /**
   * Map Vespa hits to RetrievedDocument format
   */
  private mapVespaResults(
    hits:
      | VespaHit<OpenPlaneDocument>[]
      | { items: VespaHit<OpenPlaneDocument>[] }
  ): RetrievedDocument[] {
    const items = Array.isArray(hits) ? hits : hits.items || [];

    return items.map((hit) => ({
      id: hit.fields.id,
      title: hit.fields.title || "Untitled",
      content: hit.fields.content || "",
      url: hit.fields.url,
      connectorType: hit.fields.connector_type,
      documentType: hit.fields.document_type,
      authorName: hit.fields.author_name,
      authorId: hit.fields.author_id,
      createdAt: hit.fields.created_at,
      updatedAt: hit.fields.updated_at,
      relevanceScore: hit.relevance || 0,
      metadata: {
        connectorId: hit.fields.connector_id,
        sourceId: hit.fields.source_id,
        sourceName: hit.fields.source_name,
        status: hit.fields.status,
        labels: hit.fields.labels,
      },
    }));
  }

  /**
   * Map a single Vespa document
   */
  private mapVespaDocument(
    doc: OpenPlaneDocument,
    score: number
  ): RetrievedDocument {
    return {
      id: doc.id,
      title: doc.title || "Untitled",
      content: doc.content || "",
      url: doc.url,
      connectorType: doc.connector_type,
      documentType: doc.document_type,
      authorName: doc.author_name,
      authorId: doc.author_id,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      relevanceScore: score,
      metadata: {
        connectorId: doc.connector_id,
        sourceId: doc.source_id,
        sourceName: doc.source_name,
        status: doc.status,
        labels: doc.labels,
      },
    };
  }
}

/**
 * Default retriever instance
 */
export const retriever = new Retriever();

/**
 * Convenience function
 */
export async function retrieve(
  query: string,
  teamId: string,
  options?: RetrievalOptions
): Promise<RetrievalResult> {
  return retriever.retrieve(query, teamId, options);
}

export default retriever;
