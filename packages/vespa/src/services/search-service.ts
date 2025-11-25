/**
 * Search Service
 *
 * High-level unified search across all document types.
 * Provides enterprise search features like hybrid search, facets, and suggestions.
 */

import { codeClient } from "../clients/code-client";
import { documentClient } from "../clients/document-client";
import { entityClient } from "../clients/entity-client";
import { personClient } from "../clients/person-client";
import type {
  CodeDocument,
  DocumentRankProfile,
  Embedding,
  Entity,
  OpenPlaneDocument,
  PaginatedResult,
  Person,
  VespaHit,
} from "../types";

// === Search Types ===

export type SearchScope = "all" | "documents" | "people" | "code" | "entities";

export interface UnifiedSearchOptions {
  query: string;
  teamId: string;
  scope?: SearchScope | SearchScope[];
  embedding?: Embedding;
  accessControl?: string[];
  connectorId?: string;
  connectorTypes?: string[];
  documentTypes?: string[];
  dateRange?: { from?: number; to?: number };
  limit?: number;
  offset?: number;
  rankProfile?: DocumentRankProfile;
}

export interface UnifiedSearchResult {
  query: string;
  documents: PaginatedResult<VespaHit<OpenPlaneDocument>>;
  people: VespaHit<Person>[];
  code: VespaHit<CodeDocument>[];
  entities: VespaHit<Entity>[];
  timing: {
    totalMs: number;
    documentMs: number;
    peopleMs: number;
    codeMs: number;
    entityMs: number;
  };
}

export interface FacetedSearchOptions extends UnifiedSearchOptions {
  facets?: (
    | "connectorType"
    | "documentType"
    | "author"
    | "source"
    | "status"
  )[];
}

export interface FacetResult {
  field: string;
  values: Array<{ value: string; count: number }>;
}

export interface FacetedSearchResult extends UnifiedSearchResult {
  facets: FacetResult[];
}

export interface SearchSuggestion {
  text: string;
  type: "document" | "person" | "code" | "entity" | "query";
  score: number;
  metadata?: Record<string, unknown>;
}

// === Search Service ===

export class SearchService {
  /**
   * Unified search across all content types
   */
  async search(options: UnifiedSearchOptions): Promise<UnifiedSearchResult> {
    const startTime = Date.now();
    const scopes = this.normalizeScopes(options.scope);

    // Run searches in parallel
    const [documentsResult, peopleResult, codeResult, entityResult] =
      await Promise.all([
        this.searchDocumentsIfEnabled(scopes, options),
        this.searchPeopleIfEnabled(scopes, options),
        this.searchCodeIfEnabled(scopes, options),
        this.searchEntitiesIfEnabled(scopes, options),
      ]);

    return {
      query: options.query,
      documents: documentsResult.result,
      people: peopleResult.result,
      code: codeResult.result,
      entities: entityResult.result,
      timing: {
        totalMs: Date.now() - startTime,
        documentMs: documentsResult.ms,
        peopleMs: peopleResult.ms,
        codeMs: codeResult.ms,
        entityMs: entityResult.ms,
      },
    };
  }

  /**
   * Hybrid search combining text and semantic search
   */
  async hybridSearch(
    query: string,
    embedding: Embedding,
    teamId: string,
    options: {
      accessControl?: string[];
      connectorTypes?: string[];
      limit?: number;
    } = {}
  ): Promise<PaginatedResult<VespaHit<OpenPlaneDocument>>> {
    return await documentClient.hybridSearch(query, embedding, teamId, {
      limit: options.limit,
      accessControl: options.accessControl,
    });
  }

  /**
   * Pure semantic search using embeddings
   */
  async semanticSearch(
    embedding: Embedding,
    teamId: string,
    options: {
      accessControl?: string[];
      limit?: number;
    } = {}
  ): Promise<PaginatedResult<VespaHit<OpenPlaneDocument>>> {
    return await documentClient.semanticSearch(embedding, teamId, {
      limit: options.limit,
      accessControl: options.accessControl,
    });
  }

  /**
   * Get search suggestions/autocomplete
   */
  async getSuggestions(
    prefix: string,
    teamId: string,
    options: {
      limit?: number;
      types?: ("document" | "person" | "code" | "entity")[];
    } = {}
  ): Promise<SearchSuggestion[]> {
    const { limit = 10, types = ["document", "person"] } = options;
    const suggestions: SearchSuggestion[] = [];

    // Run type-specific searches in parallel
    const tasks: Promise<void>[] = [];

    if (types.includes("document")) {
      tasks.push(
        documentClient
          .textSearch(prefix, teamId, { limit: 5 })
          .then((results) => {
            for (const hit of results.items) {
              suggestions.push({
                text: hit.fields.title,
                type: "document",
                score: hit.relevance,
                metadata: {
                  id: hit.fields.id,
                  documentType: hit.fields.document_type,
                },
              });
            }
          })
          .catch(() => {
            // Intentionally ignore - suggestions are best-effort
          })
      );
    }

    if (types.includes("person")) {
      tasks.push(
        personClient
          .searchByName(prefix, teamId, { limit: 5 })
          .then((results) => {
            for (const hit of results) {
              suggestions.push({
                text: hit.fields.name,
                type: "person",
                score: hit.relevance,
                metadata: {
                  id: hit.fields.id,
                  email: hit.fields.email,
                  jobTitle: hit.fields.job_title,
                },
              });
            }
          })
          .catch(() => {
            // Intentionally ignore - suggestions are best-effort
          })
      );
    }

    if (types.includes("code")) {
      tasks.push(
        codeClient
          .textSearch(prefix, teamId, { limit: 3 })
          .then((results) => {
            for (const hit of results) {
              suggestions.push({
                text: hit.fields.file_name,
                type: "code",
                score: hit.relevance,
                metadata: {
                  id: hit.fields.id,
                  language: hit.fields.language,
                  repoName: hit.fields.repo_name,
                },
              });
            }
          })
          .catch(() => {
            // Intentionally ignore - suggestions are best-effort
          })
      );
    }

    if (types.includes("entity")) {
      tasks.push(
        entityClient
          .searchByName(prefix, teamId, { limit: 3 })
          .then((results) => {
            for (const hit of results) {
              suggestions.push({
                text: hit.fields.name,
                type: "entity",
                score: hit.relevance,
                metadata: {
                  id: hit.fields.id,
                  entityType: hit.fields.entity_type,
                },
              });
            }
          })
          .catch(() => {
            // Intentionally ignore - suggestions are best-effort
          })
      );
    }

    await Promise.all(tasks);

    // Sort by score and limit
    return suggestions.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Find related content for a document
   */
  async findRelated(
    documentId: string,
    teamId: string,
    options: { limit?: number } = {}
  ): Promise<{
    documents: VespaHit<OpenPlaneDocument>[];
    people: VespaHit<Person>[];
    entities: VespaHit<Entity>[];
  }> {
    const [documents, doc] = await Promise.all([
      documentClient.getSimilar(documentId, teamId, { limit: options.limit }),
      documentClient.get(documentId),
    ]);

    // Find related people (author + contributors)
    const people: VespaHit<Person>[] = [];
    if (doc?.author_id) {
      const author = await personClient.get(doc.author_id);
      if (author) {
        people.push({
          id: author.id,
          relevance: 1.0,
          source: "person",
          fields: author,
        });
      }
    }

    // Find related entities (projects, channels)
    const entities: VespaHit<Entity>[] = [];
    if (doc?.source_id) {
      const entity = await entityClient.get(doc.source_id);
      if (entity) {
        entities.push({
          id: entity.id,
          relevance: 1.0,
          source: "entity",
          fields: entity,
        });
      }
    }

    return { documents, people, entities };
  }

  /**
   * Get trending content
   */
  async getTrending(
    teamId: string,
    options: { hours?: number; limit?: number } = {}
  ): Promise<VespaHit<OpenPlaneDocument>[]> {
    return await documentClient.getRecent(teamId, {
      hours: options.hours || 24,
      limit: options.limit || 20,
    });
  }

  /**
   * Search within a specific connector
   */
  async searchConnector(
    query: string,
    connectorId: string,
    teamId: string,
    options: {
      embedding?: Embedding;
      accessControl?: string[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<PaginatedResult<VespaHit<OpenPlaneDocument>>> {
    return await documentClient.search({
      query,
      teamId,
      connectorId,
      embedding: options.embedding,
      accessControl: options.accessControl,
      limit: options.limit,
      offset: options.offset,
      rankProfile: options.embedding ? "hybrid" : "bm25",
    });
  }

  // === Private Helpers ===

  private normalizeScopes(
    scope?: SearchScope | SearchScope[]
  ): Set<SearchScope> {
    if (!scope) {
      return new Set(["all"]);
    }
    if (Array.isArray(scope)) {
      return new Set(scope);
    }
    return new Set([scope]);
  }

  private async searchDocumentsIfEnabled(
    scopes: Set<SearchScope>,
    options: UnifiedSearchOptions
  ): Promise<{
    result: PaginatedResult<VespaHit<OpenPlaneDocument>>;
    ms: number;
  }> {
    if (!(scopes.has("all") || scopes.has("documents"))) {
      return {
        result: { items: [], total: 0, hasMore: false, offset: 0, limit: 0 },
        ms: 0,
      };
    }

    const start = Date.now();
    const result = await documentClient.search({
      query: options.query,
      teamId: options.teamId,
      embedding: options.embedding,
      accessControl: options.accessControl,
      connectorId: options.connectorId,
      dateRange: options.dateRange,
      limit: options.limit || 20,
      offset: options.offset || 0,
      rankProfile:
        options.rankProfile || (options.embedding ? "hybrid" : "bm25"),
    });

    return { result, ms: Date.now() - start };
  }

  private async searchPeopleIfEnabled(
    scopes: Set<SearchScope>,
    options: UnifiedSearchOptions
  ): Promise<{ result: VespaHit<Person>[]; ms: number }> {
    if (!(scopes.has("all") || scopes.has("people"))) {
      return { result: [], ms: 0 };
    }

    const start = Date.now();
    const result = await personClient.searchByName(
      options.query,
      options.teamId,
      {
        limit: Math.min(options.limit || 10, 10),
      }
    );

    return { result, ms: Date.now() - start };
  }

  private async searchCodeIfEnabled(
    scopes: Set<SearchScope>,
    options: UnifiedSearchOptions
  ): Promise<{ result: VespaHit<CodeDocument>[]; ms: number }> {
    if (!(scopes.has("all") || scopes.has("code"))) {
      return { result: [], ms: 0 };
    }

    const start = Date.now();
    const result = await codeClient.textSearch(options.query, options.teamId, {
      limit: Math.min(options.limit || 10, 10),
    });

    return { result, ms: Date.now() - start };
  }

  private async searchEntitiesIfEnabled(
    scopes: Set<SearchScope>,
    options: UnifiedSearchOptions
  ): Promise<{ result: VespaHit<Entity>[]; ms: number }> {
    if (!(scopes.has("all") || scopes.has("entities"))) {
      return { result: [], ms: 0 };
    }

    const start = Date.now();
    const result = await entityClient.searchByName(
      options.query,
      options.teamId,
      {
        limit: Math.min(options.limit || 10, 10),
      }
    );

    return { result, ms: Date.now() - start };
  }
}

export const searchService = new SearchService();
