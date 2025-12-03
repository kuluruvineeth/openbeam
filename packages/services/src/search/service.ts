import { embedQuery, getConfig as getAIConfig } from "@openplane/ai";
import {
  buildVectorQueryFeatures,
  type GenericDocument,
  vespaClient,
} from "@openplane/vespa";
import { getOrGenerateEmbedding } from "../ai/embedding-cache";
import type {
  AuthorSearchParams,
  AutocompleteParams,
  AutocompleteSuggestion,
  RecentDocumentsParams,
  SearchParams,
  SearchResult,
  SimilarDocumentsParams,
  ThreadSearchParams,
} from "./types";

function escapeYqlString(value: string): string {
  return value.replace(/(["\\])/g, "\\$1");
}

export class SearchService {
  async search(params: SearchParams): Promise<SearchResult> {
    const startTime = Date.now();
    let embeddingTime: number | undefined;

    try {
      const ranking = params.ranking || "hybrid";
      const useSemanticSearch = ranking === "hybrid" || ranking === "semantic";

      let vectorFeatures: Record<string, unknown> = {};
      if (useSemanticSearch && params.query) {
        const embeddingStart = Date.now();
        const queryEmbedding = await this.getQueryEmbedding(params.query);
        embeddingTime = Date.now() - embeddingStart;

        if (queryEmbedding) {
          vectorFeatures = buildVectorQueryFeatures(queryEmbedding);
        }
      }

      const yql = this.buildSearchYQL(params, useSemanticSearch);

      const vespaResult = await vespaClient.query({
        yql,
        ranking,
        hits: params.limit || 20,
        offset: params.offset || 0,
        timeout: "5s",
        ...vectorFeatures,
      });

      const documents = this.extractDocuments(vespaResult);

      const total =
        (vespaResult.root.fields?.totalCount as number | undefined) ||
        documents.length;

      const queryTime = Date.now() - startTime;

      return {
        documents,
        total,
        limit: params.limit || 20,
        offset: params.offset || 0,
        hasMore: (params.offset || 0) + documents.length < total,
        queryTime,
        embeddingTime,
      };
    } catch (error) {
      console.error("Search error:", error);
      throw new Error(
        `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private async getQueryEmbedding(query: string): Promise<number[] | null> {
    try {
      const aiConfig = getAIConfig();
      const modelId = aiConfig.defaultEmbeddingModel;

      return await getOrGenerateEmbedding(query, modelId, () =>
        embedQuery(query)
      );
    } catch (error) {
      console.warn(
        "Failed to generate query embedding, using BM25 only:",
        error
      );
      return null;
    }
  }

  async searchThread(params: ThreadSearchParams): Promise<GenericDocument[]> {
    const { threadId, teamId, accessControlIds } = params;

    const yql = `select * from openplane_document where thread_id contains "${escapeYqlString(
      threadId
    )}" and team_id contains "${escapeYqlString(
      teamId
    )}" and ${this.buildAccessControlClause(
      accessControlIds
    )} order by created_at asc`;

    const result = await vespaClient.query({
      yql,
      ranking: "bm25",
      hits: 100,
    });

    return this.extractDocuments(result);
  }

  async findSimilar(
    params: SimilarDocumentsParams
  ): Promise<GenericDocument[]> {
    const { documentId, teamId, limit = 10, accessControlIds } = params;

    const doc = await vespaClient.getDocument(documentId);
    if (!doc?.content_embedding) {
      throw new Error("Document not found or has no embedding");
    }

    if (!this.isDocumentAccessible(doc, accessControlIds)) {
      throw new Error("Document not accessible");
    }

    const yql = `select * from openplane_document where ({targetHits:${limit * 2}}nearestNeighbor(content_embedding, query_embedding)) and team_id contains "${escapeYqlString(
      teamId
    )}" and ${this.buildAccessControlClause(accessControlIds)} and id != "${escapeYqlString(documentId)}"`;

    const vectorFeatures = buildVectorQueryFeatures(doc.content_embedding);

    const result = await vespaClient.query({
      yql,
      ranking: "semantic",
      hits: limit,
      ...vectorFeatures,
    });

    return this.extractDocuments(result);
  }

  async getRecentDocuments(
    params: RecentDocumentsParams
  ): Promise<GenericDocument[]> {
    const { teamId, hours = 24, limit = 20, accessControlIds } = params;
    const fromDate = Date.now() - hours * 60 * 60 * 1000;

    const yql = `select * from openplane_document where team_id contains "${escapeYqlString(
      teamId
    )}" and created_at >= ${fromDate} and ${this.buildAccessControlClause(
      accessControlIds
    )} order by created_at desc limit ${limit}`;

    const result = await vespaClient.query({
      yql,
      ranking: "recency",
      hits: limit,
    });

    return this.extractDocuments(result);
  }

  async searchByAuthor(params: AuthorSearchParams): Promise<GenericDocument[]> {
    const { authorId, teamId, limit = 50, accessControlIds } = params;

    const yql = `select * from openplane_document where author_id contains "${escapeYqlString(
      authorId
    )}" and team_id contains "${escapeYqlString(
      teamId
    )}" and ${this.buildAccessControlClause(
      accessControlIds
    )} order by created_at desc limit ${limit}`;

    const result = await vespaClient.query({
      yql,
      ranking: "bm25",
      hits: limit,
    });

    return this.extractDocuments(result);
  }

  async autocomplete(
    params: AutocompleteParams
  ): Promise<AutocompleteSuggestion[]> {
    const { prefix, teamId, limit = 10, accessControlIds } = params;

    if (!prefix || prefix.length < 2) {
      return [];
    }

    const escapedPrefix = escapeYqlString(prefix);
    const yql = `select id, title, content, document_type, connector_type, source_name from openplane_document where (title contains "${escapedPrefix}" or content contains "${escapedPrefix}") and team_id contains "${escapeYqlString(
      teamId
    )}" and ${this.buildAccessControlClause(accessControlIds)} limit ${limit}`;

    const result = await vespaClient.query({
      yql,
      ranking: "bm25",
      hits: limit,
    });

    const children = result.root.children || [];
    return children.map((child) => ({
      id: child.fields.id as string,
      title: child.fields.title as string,
      content: child.fields.content as string,
      documentType: child.fields.document_type as string,
      connectorType: child.fields.connector_type as string,
      sourceName: child.fields.source_name as string | undefined,
    }));
  }

  private buildSearchYQL(
    params: SearchParams,
    includeVectorSearch = false
  ): string {
    const conditions: string[] = [];
    const limit = params.limit || 20;

    const pushContains = (field: string, value?: string) => {
      if (!value) {
        return;
      }
      conditions.push(`${field} contains "${escapeYqlString(value)}"`);
    };

    const pushContainsAny = (field: string, values?: string[]) => {
      if (!values || values.length === 0) {
        return;
      }
      const safeValues = values.filter(Boolean);
      if (safeValues.length === 0) {
        return;
      }
      if (safeValues.length === 1) {
        conditions.push(
          `${field} contains "${escapeYqlString(safeValues[0]?.toLowerCase() ?? "")}"`
        );
      } else {
        const orConditions = safeValues
          .map((v) => `${field} contains "${escapeYqlString(v.toLowerCase())}"`)
          .join(" or ");
        conditions.push(`(${orConditions})`);
      }
    };

    pushContains("team_id", params.teamId);

    if (includeVectorSearch && params.query) {
      const vectorClause = `({targetHits:${limit * 2}}nearestNeighbor(content_embedding, query_embedding))`;
      const textClause = `default contains "${escapeYqlString(params.query)}"`;
      conditions.push(`(${vectorClause} or (${textClause}))`);
    } else if (params.query) {
      conditions.push(`(default contains "${escapeYqlString(params.query)}")`);
    }

    pushContainsAny("connector_type", params.connectorTypes);
    pushContainsAny("document_type", params.documentTypes);
    pushContainsAny("source_type", params.sourceTypes);
    pushContainsAny("status", params.statuses);
    pushContainsAny("priority", params.priorities);

    if (params.labels && params.labels.length > 0) {
      const labelConditions = params.labels
        .map((l) => `labels contains "${escapeYqlString(l)}"`)
        .join(" or ");
      conditions.push(`(${labelConditions})`);
    }

    pushContains("connector_id", params.connectorId);
    pushContains("author_id", params.authorId);
    pushContains("source_id", params.sourceId);

    if (params.fromDate) {
      conditions.push(`created_at >= ${params.fromDate}`);
    }
    if (params.toDate) {
      conditions.push(`created_at <= ${params.toDate}`);
    }

    conditions.push(this.buildAccessControlClause(params.accessControlIds));

    const whereClause = conditions.join(" and ");
    const offset = params.offset || 0;

    return `select * from openplane_document where ${whereClause} limit ${limit} offset ${offset}`;
  }

  private buildAccessControlClause(accessControlIds?: string[]): string {
    if (accessControlIds && accessControlIds.length > 0) {
      const aclConditions = accessControlIds
        .map(
          (identifier) =>
            `access_control contains "${escapeYqlString(identifier)}"`
        )
        .join(" or ");
      return `(is_public = true or (${aclConditions}))`;
    }

    return "is_public = true";
  }

  private isDocumentAccessible(
    doc: GenericDocument | null | undefined,
    accessControlIds?: string[]
  ): boolean {
    if (!doc) {
      return false;
    }

    if (doc.is_public) {
      return true;
    }

    if (!doc.access_control || doc.access_control.length === 0) {
      return false;
    }

    if (!accessControlIds || accessControlIds.length === 0) {
      return false;
    }

    return doc.access_control.some((id) => accessControlIds.includes(id));
  }

  private extractDocuments(result: {
    root: {
      children?: Array<{ fields: unknown }>;
    };
  }): GenericDocument[] {
    if (!result.root.children || result.root.children.length === 0) {
      return [];
    }

    return result.root.children.map((child) => child.fields as GenericDocument);
  }
}

export const searchService = new SearchService();
