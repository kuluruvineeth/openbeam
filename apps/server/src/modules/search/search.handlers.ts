import type { RouteHandler } from "@hono/zod-openapi";
import { searchQueriesCounter } from "@/metrics";
import type { AuthEnv } from "@/middleware/auth";
import { getOrganizationId } from "@/middleware/auth";
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
  const organizationId = getOrganizationId(c);

  if (!organizationId) {
    return c.json({ error: "organization_id is required" }, 400);
  }

  const authContext = c.get("authContext");
  const accessControlIds = getACLIds(authContext);

  const searchParams: SearchParams = {
    query: queryParams.q,
    organizationId,
    connectorType: queryParams.connector_type,
    connectorId: queryParams.connector_id,
    documentType: queryParams.document_type,
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
  const organizationId = getOrganizationId(c);

  if (!organizationId) {
    return c.json({ error: "organization_id is required" }, 400);
  }

  if (!prefix || prefix.length < 2) {
    return c.json({ suggestions: [] }, 200);
  }

  const authContext = c.get("authContext");
  const accessControlIds = getACLIds(authContext);

  const suggestions = await searchService.autocomplete(
    prefix,
    organizationId,
    limit,
    accessControlIds
  );
  searchQueriesCounter.inc({ endpoint: "autocomplete" });

  // Map to simple string array as expected by schema
  return c.json({ suggestions: suggestions.map((s) => s.title) }, 200);
};

export const recentDocumentsHandler: RouteHandler<
  typeof recentDocuments,
  AuthEnv
> = async (c) => {
  const { hours = 24, limit = 20 } = c.req.valid("query");
  const organizationId = getOrganizationId(c);

  if (!organizationId) {
    return c.json({ error: "organization_id is required" }, 400);
  }

  const authContext = c.get("authContext");
  const accessControlIds = getACLIds(authContext);

  const documents = await searchService.getRecentDocuments(
    organizationId,
    hours,
    limit,
    accessControlIds
  );
  searchQueriesCounter.inc({ endpoint: "recent" });

  return c.json({ documents, count: documents.length }, 200);
};

export const threadSearchHandler: RouteHandler<
  typeof threadSearch,
  AuthEnv
> = async (c) => {
  const { threadId } = c.req.valid("param");
  const organizationId = getOrganizationId(c);

  if (!organizationId) {
    return c.json({ error: "organization_id is required" }, 400);
  }

  const authContext = c.get("authContext");
  const accessControlIds = getACLIds(authContext);

  const documents = await searchService.searchThread(
    threadId,
    organizationId,
    accessControlIds
  );
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
  const organizationId = getOrganizationId(c);

  if (!organizationId) {
    return c.json({ error: "organization_id is required" }, 400);
  }

  const authContext = c.get("authContext");
  const accessControlIds = getACLIds(authContext);

  const documents = await searchService.findSimilar(
    documentId,
    organizationId,
    limit,
    accessControlIds
  );
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
  const organizationId = getOrganizationId(c);

  if (!organizationId) {
    return c.json({ error: "organization_id is required" }, 400);
  }

  const authContext = c.get("authContext");
  const accessControlIds = getACLIds(authContext);

  const documents = await searchService.searchByAuthor(
    authorId,
    organizationId,
    limit,
    accessControlIds
  );
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
