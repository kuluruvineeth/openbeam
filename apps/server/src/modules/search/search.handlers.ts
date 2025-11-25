/**
 * Enhanced Search API Handlers
 * Request handlers for search operations
 */

import type { RouteHandler } from "@hono/zod-openapi";
import * as response from "@/lib/response";
import { searchQueriesCounter } from "@/metrics";
import { type AuthEnv, getTeamId } from "@/middleware/auth";
import { getAccessControlIds } from "@/types/auth";
import type {
  answerSearch,
  authorSearch,
  autocomplete,
  mainSearch,
  recentDocuments,
  similarDocuments,
  threadSearch,
} from "./search.routes";
import { searchService } from "./search.service";

// ============================================================================
// Main Search
// ============================================================================

export const mainSearchHandler: RouteHandler<
  typeof mainSearch,
  AuthEnv
> = async (c) => {
  const query = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const authContext = c.get("authContext");
  const accessControlIds = getAccessControlIds(authContext);

  // Parse comma-separated values
  const connectorTypes = query.connector_types?.split(",").map((s) => s.trim());
  const connectorIds = query.connector_ids?.split(",").map((s) => s.trim());
  const documentTypes = query.document_types?.split(",").map((s) => s.trim());
  const authorIds = query.author_ids?.split(",").map((s) => s.trim());
  const sourceIds = query.source_ids?.split(",").map((s) => s.trim());
  const tags = query.tags?.split(",").map((s) => s.trim());

  const result = await searchService.search({
    query: query.q,
    teamId,
    accessControlIds,
    connectorTypes,
    connectorIds,
    documentTypes,
    authorIds,
    sourceIds,
    tags,
    fromDate: query.from_date,
    toDate: query.to_date,
    limit: query.limit,
    offset: query.offset,
    ranking: query.ranking,
    includeSnippets: query.include_snippets,
    snippetLength: query.snippet_length,
    includeFacets: query.include_facets,
    includeAggregations: query.include_aggregations,
    groupByThread: query.group_by_thread,
  });

  searchQueriesCounter.inc({ endpoint: "search" });

  const page = Math.floor(query.offset / query.limit) + 1;
  const totalPages = Math.ceil(result.total / query.limit);

  return c.json(
    {
      success: true,
      data: {
        documents: result.documents,
        total: result.total,
        query: query.q,
        ranking: query.ranking,
        facets: result.facets,
        aggregations: result.aggregations,
        suggestions: result.suggestions,
        queryTime: result.queryTime,
      },
      pagination: {
        page,
        pageSize: query.limit,
        total: result.total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    },
    200
  );
};

// ============================================================================
// Autocomplete
// ============================================================================

export const autocompleteHandler: RouteHandler<
  typeof autocomplete,
  AuthEnv
> = async (c) => {
  const query = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const authContext = c.get("authContext");
  const accessControlIds = getAccessControlIds(authContext);

  const types = query.types?.split(",").map((s) => s.trim()) || [];

  const suggestions = await searchService.autocomplete(query.q, teamId, {
    limit: query.limit,
    types,
    accessControlIds,
  });

  searchQueriesCounter.inc({ endpoint: "autocomplete" });

  return response.success(c, {
    suggestions,
    query: query.q,
  });
};

// ============================================================================
// Recent Documents
// ============================================================================

export const recentDocumentsHandler: RouteHandler<
  typeof recentDocuments,
  AuthEnv
> = async (c) => {
  const query = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const authContext = c.get("authContext");
  const accessControlIds = getAccessControlIds(authContext);

  const connectorTypes = query.connector_types?.split(",").map((s) => s.trim());
  const documentTypes = query.document_types?.split(",").map((s) => s.trim());

  const documents = await searchService.getRecentDocuments(teamId, {
    hours: query.hours,
    limit: query.limit,
    connectorTypes,
    documentTypes,
    accessControlIds,
  });

  searchQueriesCounter.inc({ endpoint: "recent" });

  return response.success(c, {
    documents,
    count: documents.length,
    hours: query.hours,
  });
};

// ============================================================================
// Thread Search
// ============================================================================

export const threadSearchHandler: RouteHandler<
  typeof threadSearch,
  AuthEnv
> = async (c) => {
  const { threadId } = c.req.valid("param");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const authContext = c.get("authContext");
  const accessControlIds = getAccessControlIds(authContext);

  const result = await searchService.searchThread(
    threadId,
    teamId,
    accessControlIds
  );

  searchQueriesCounter.inc({ endpoint: "thread" });

  if (result.documents.length === 0) {
    return response.notFound(c, "Thread", threadId);
  }

  return response.success(c, {
    threadId,
    documents: result.documents,
    count: result.documents.length,
    participants: result.participants,
  });
};

// ============================================================================
// Similar Documents
// ============================================================================

export const similarDocumentsHandler: RouteHandler<
  typeof similarDocuments,
  AuthEnv
> = async (c) => {
  const { documentId } = c.req.valid("param");
  const query = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const authContext = c.get("authContext");
  const accessControlIds = getAccessControlIds(authContext);

  try {
    const result = await searchService.findSimilar(documentId, teamId, {
      limit: query.limit,
      minScore: query.min_score,
      accessControlIds,
    });

    searchQueriesCounter.inc({ endpoint: "similar" });

    return response.success(c, {
      sourceDocumentId: documentId,
      sourceDocument: result.sourceDocument,
      similarDocuments: result.similarDocuments,
      count: result.similarDocuments.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Document not found") {
      return response.notFound(c, "Document", documentId);
    }
    throw error;
  }
};

// ============================================================================
// Author Search
// ============================================================================

export const authorSearchHandler: RouteHandler<
  typeof authorSearch,
  AuthEnv
> = async (c) => {
  const { authorId } = c.req.valid("param");
  const query = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const authContext = c.get("authContext");
  const accessControlIds = getAccessControlIds(authContext);

  const documentTypes = query.document_types?.split(",").map((s) => s.trim());

  const result = await searchService.searchByAuthor(authorId, teamId, {
    limit: query.limit,
    documentTypes,
    fromDate: query.from_date,
    toDate: query.to_date,
    accessControlIds,
  });

  searchQueriesCounter.inc({ endpoint: "author" });

  return response.success(c, {
    authorId,
    documents: result.documents,
    count: result.documents.length,
    documentTypeBreakdown: result.documentTypeBreakdown,
  });
};

// ============================================================================
// AI Answer
// ============================================================================

export const answerSearchHandler: RouteHandler<
  typeof answerSearch,
  AuthEnv
> = async (c) => {
  const query = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const authContext = c.get("authContext");
  const accessControlIds = getAccessControlIds(authContext);

  // First, search for relevant documents
  const searchResult = await searchService.search({
    query: query.q,
    teamId,
    accessControlIds,
    limit: query.max_sources,
    offset: 0,
    ranking: "hybrid",
  });

  searchQueriesCounter.inc({ endpoint: "answer" });

  // TODO: Integrate with AI service for answer generation
  // For now, return a placeholder response
  return response.success(c, {
    question: query.q,
    answer:
      "AI-generated answers are coming soon. For now, here are the most relevant documents.",
    confidence: 0,
    citations: searchResult.documents
      .slice(0, query.max_sources)
      .map((doc) => ({
        documentId: doc.id,
        title: doc.title,
        url: doc.url,
        snippet: doc.snippet || "",
        relevanceScore: doc.relevanceScore || 0,
      })),
    relatedQuestions: [],
  });
};
