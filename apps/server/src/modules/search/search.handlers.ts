import type { RouteHandler } from "@hono/zod-openapi";
import { searchQueriesCounter } from "@/metrics";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import { getAccessControlIds as getACLIds } from "@/types/auth";
import type {
  authorSearch,
  autocomplete,
  mainSearch,
  recentDocuments,
  similarDocuments,
  threadSearch,
} from "./search.routes";
import { type SearchParams, searchService } from "./search.service";

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

export const autocompleteHandler: RouteHandler<
  typeof autocomplete,
  AuthEnv
> = async (c) => {
  const { q: prefix, limit = 10 } = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  if (!prefix || prefix.length < 2) {
    return c.json({ suggestions: [] }, 200);
  }

  const authContext = c.get("authContext");
  const accessControlIds = getACLIds(authContext);

  const suggestions = await searchService.autocomplete({
    prefix,
    teamId,
    limit,
    accessControlIds,
  });
  searchQueriesCounter.inc({ endpoint: "autocomplete" });

  return c.json({ suggestions: suggestions.map((s) => s.title) }, 200);
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
