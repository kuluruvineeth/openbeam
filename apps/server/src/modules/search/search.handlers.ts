import type { RouteHandler } from "@hono/zod-openapi";
import { hybridSearchOrchestrator } from "@openbeam/services";
import { searchQueriesCounter } from "@/metrics";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import { getAccessControlIds as getACLIds } from "@/types/auth";
import type {
  authorSearch,
  hybridSearch,
  mainSearch,
  mediaSearch,
  recentDocuments,
  similarDocuments,
  threadSearch,
  unifiedSearch,
} from "./search.routes";
import {
  type MediaSearchParams,
  type SearchParams,
  searchService,
} from "./search.service";

// @ts-expect-error — RouteHandler<mainSearch, AuthEnv> exceeds TS type instantiation depth
export const mainSearchHandler: RouteHandler<
  typeof mainSearch,
  AuthEnv
> = async (c) => {
  const queryParams = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  const authContext = c.get("authContext");
  const accessControlIds = getACLIds(authContext);

  const searchParams: SearchParams = {
    query: queryParams.q,
    teamId,
    connectorTypes: queryParams.connector_type,
    connectorId: queryParams.connector_id,
    documentTypes: queryParams.document_type,
    sourceTypes: queryParams.source_type,
    statuses: queryParams.status,
    priorities: queryParams.priority,
    labels: queryParams.label,
    authorId: queryParams.author_id,
    sourceId: queryParams.source_id,
    fromDate: queryParams.from_date,
    toDate: queryParams.to_date,
    limit: queryParams.limit,
    offset: queryParams.offset,
    ranking: queryParams.ranking,
    accessControlIds,
  };

  const result = await searchService.search(searchParams);
  searchQueriesCounter.inc({ endpoint: "search" });

  return c.json(
    {
      documents: result.documents,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      query: queryParams.q,
      ranking: queryParams.ranking || "hybrid",
    },
    200
  );
};

export const recentDocumentsHandler: RouteHandler<
  typeof recentDocuments,
  AuthEnv
> = async (c) => {
  const { hours = 24, limit = 20 } = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  const authContext = c.get("authContext");
  const accessControlIds = getACLIds(authContext);

  const documents = await searchService.getRecentDocuments({
    teamId,
    hours,
    limit,
    accessControlIds,
  });
  searchQueriesCounter.inc({ endpoint: "recent" });

  return c.json({ documents, count: documents.length }, 200);
};

export const threadSearchHandler: RouteHandler<
  typeof threadSearch,
  AuthEnv
> = async (c) => {
  const { threadId } = c.req.valid("param");
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  const authContext = c.get("authContext");
  const accessControlIds = getACLIds(authContext);

  const documents = await searchService.searchThread({
    threadId,
    teamId,
    accessControlIds,
  });
  searchQueriesCounter.inc({ endpoint: "thread" });

  return c.json(
    {
      threadId,
      documents,
      count: documents.length,
    },
    200
  );
};

export const similarDocumentsHandler: RouteHandler<
  typeof similarDocuments,
  AuthEnv
> = async (c) => {
  const { documentId } = c.req.valid("param");
  const { limit = 10 } = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  const authContext = c.get("authContext");
  const accessControlIds = getACLIds(authContext);

  const documents = await searchService.findSimilar({
    documentId,
    teamId,
    limit,
    accessControlIds,
  });
  searchQueriesCounter.inc({ endpoint: "similar" });

  return c.json(
    {
      sourceDocumentId: documentId,
      similarDocuments: documents,
      count: documents.length,
    },
    200
  );
};

export const authorSearchHandler: RouteHandler<
  typeof authorSearch,
  AuthEnv
> = async (c) => {
  const { authorId } = c.req.valid("param");
  const { limit = 50 } = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  const authContext = c.get("authContext");
  const accessControlIds = getACLIds(authContext);

  const documents = await searchService.searchByAuthor({
    authorId,
    teamId,
    limit,
    accessControlIds,
  });
  searchQueriesCounter.inc({ endpoint: "author" });

  return c.json(
    {
      authorId,
      documents,
      count: documents.length,
    },
    200
  );
};

export const mediaSearchHandler: RouteHandler<
  typeof mediaSearch,
  AuthEnv
> = async (c) => {
  const queryParams = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  const authContext = c.get("authContext");
  const accessControlIds = getACLIds(authContext);

  const params: MediaSearchParams = {
    query: queryParams.q,
    teamId,
    connectorId: queryParams.connector_id,
    sourceId: queryParams.source_id,
    mediaType: queryParams.media_type,
    fromDate: queryParams.from_date,
    toDate: queryParams.to_date,
    limit: queryParams.limit,
    offset: queryParams.offset,
    ranking: queryParams.ranking,
    accessControlIds,
  };

  const result = await searchService.searchMedia(params);
  searchQueriesCounter.inc({ endpoint: "media_search" });

  return c.json(
    {
      media: result.media,
      total: result.total,
      query: queryParams.q,
      ranking: queryParams.ranking || "hybrid",
      queryTime: result.queryTime,
    },
    200
  );
};

export const unifiedSearchHandler: RouteHandler<
  typeof unifiedSearch,
  AuthEnv
> = async (c) => {
  const queryParams = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  const authContext = c.get("authContext");
  const accessControlIds = getACLIds(authContext);

  const result = await searchService.searchUnified({
    query: queryParams.q,
    teamId,
    includeDocuments: queryParams.include_documents,
    includeMedia: queryParams.include_media,
    connectorTypes: queryParams.connector_type,
    connectorId: queryParams.connector_id,
    documentTypes: queryParams.document_type,
    sourceId: queryParams.source_id,
    fromDate: queryParams.from_date,
    toDate: queryParams.to_date,
    limit: queryParams.limit,
    offset: queryParams.offset,
    ranking: queryParams.ranking,
    mediaRanking: queryParams.media_ranking,
    accessControlIds,
  });
  searchQueriesCounter.inc({ endpoint: "unified_search" });

  return c.json(
    {
      documents: result.documents,
      media: result.media,
      documentTotal: result.documentTotal,
      mediaTotal: result.mediaTotal,
      total: result.total,
      query: queryParams.q,
      queryTime: result.queryTime,
    },
    200
  );
};

export const hybridSearchHandler: RouteHandler<
  typeof hybridSearch,
  AuthEnv
> = async (c) => {
  const queryParams = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  const authContext = c.get("authContext");
  const accessControlIds = getACLIds(authContext);

  const result = await hybridSearchOrchestrator.search({
    query: queryParams.q,
    teamId,
    limit: queryParams.limit,
    offset: queryParams.offset,
    mode: queryParams.mode,
    rrfConfig: {
      k: queryParams.rrf_k,
      weights: {
        bm25: queryParams.weight_bm25,
        dense: queryParams.weight_dense,
        sparse: queryParams.weight_sparse,
      },
    },
    filters: {
      connectorTypes: queryParams.connector_type,
      documentTypes: queryParams.document_type,
      sourceIds: queryParams.source_id,
      fromDate: queryParams.from_date,
      toDate: queryParams.to_date,
    },
    accessControlIds,
  });

  searchQueriesCounter.inc({ endpoint: "hybrid" });

  return c.json(result, 200);
};
