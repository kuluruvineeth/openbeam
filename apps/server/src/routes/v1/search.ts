import { Hono } from "hono";
import { searchQueriesCounter } from "../../metrics";
import {
  type AuthEnv,
  getOrganizationId,
  requireAuth,
  requireScopes,
} from "../../middleware/auth";
import {
  type SearchParams,
  searchService,
} from "../../services/search-service";
import { API_SCOPES, getAccessControlIds as getACLIds } from "../../types/auth";

const search = new Hono<AuthEnv>();
search.use("*", requireAuth);
search.use("*", requireScopes([API_SCOPES.SEARCH_READ]));

/**
 * GET /v1/search
 * Main search endpoint with filters
 */
search.get("/", async (c) => {
  try {
    // Extract query parameters
    const query = c.req.query("q") || "";
    const connectorType = c.req.query("connector_type");
    const connectorId = c.req.query("connector_id");
    const documentType = c.req.query("document_type");
    const authorId = c.req.query("author_id");
    const sourceId = c.req.query("source_id");
    const fromDate = c.req.query("from_date");
    const toDate = c.req.query("to_date");
    const limit = c.req.query("limit");
    const offset = c.req.query("offset");
    const ranking = c.req.query("ranking") as
      | "bm25"
      | "semantic"
      | "hybrid"
      | "recency"
      | "engagement"
      | undefined;

    // Get organization from auth context
    const organizationId = getOrganizationId(c);

    if (!organizationId) {
      return c.json({ error: "organization_id is required" }, 400);
    }

    // Build search params
    const authContext = c.get("authContext");
    const accessControlIds = getACLIds(authContext);

    const searchParams: SearchParams = {
      query,
      organizationId,
      connectorType,
      connectorId,
      documentType,
      authorId,
      sourceId,
      fromDate: fromDate ? Number.parseInt(fromDate, 10) : undefined,
      toDate: toDate ? Number.parseInt(toDate, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : 20,
      offset: offset ? Number.parseInt(offset, 10) : 0,
      ranking: ranking || "hybrid",
      accessControlIds,
    };

    // Execute search
    const result = await searchService.search(searchParams);
    searchQueriesCounter.inc({ endpoint: "search" });

    return c.json(result);
  } catch (error) {
    console.error("Search endpoint error:", error);
    return c.json(
      {
        error: "Search failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /v1/search/autocomplete
 * Autocomplete suggestions
 */
search.get("/autocomplete", async (c) => {
  try {
    const prefix = c.req.query("q") || "";
    const organizationId = getOrganizationId(c);
    const limit = c.req.query("limit");

    if (!organizationId) {
      return c.json({ error: "organization_id is required" }, 400);
    }

    if (!prefix || prefix.length < 2) {
      return c.json({ suggestions: [] });
    }

    const authContext = c.get("authContext");
    const accessControlIds = getACLIds(authContext);

    const suggestions = await searchService.autocomplete(
      prefix,
      organizationId,
      limit ? Number.parseInt(limit, 10) : 10,
      accessControlIds
    );
    searchQueriesCounter.inc({ endpoint: "autocomplete" });

    return c.json({ suggestions });
  } catch (error) {
    console.error("Autocomplete error:", error);
    return c.json(
      {
        error: "Autocomplete failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /v1/search/recent
 * Get recently created/updated documents
 */
search.get("/recent", async (c) => {
  try {
    const organizationId = getOrganizationId(c);
    const hours = c.req.query("hours");
    const limit = c.req.query("limit");

    if (!organizationId) {
      return c.json({ error: "organization_id is required" }, 400);
    }

    const authContext = c.get("authContext");
    const accessControlIds = getACLIds(authContext);

    const documents = await searchService.getRecentDocuments(
      organizationId,
      hours ? Number.parseInt(hours, 10) : 24,
      limit ? Number.parseInt(limit, 10) : 20,
      accessControlIds
    );
    searchQueriesCounter.inc({ endpoint: "recent" });

    return c.json({ documents, count: documents.length });
  } catch (error) {
    console.error("Recent documents error:", error);
    return c.json(
      {
        error: "Failed to fetch recent documents",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /v1/search/thread/:threadId
 * Get all messages in a thread
 */
search.get("/thread/:threadId", async (c) => {
  try {
    const threadId = c.req.param("threadId");
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

    return c.json({
      threadId,
      documents,
      count: documents.length,
    });
  } catch (error) {
    console.error("Thread search error:", error);
    return c.json(
      {
        error: "Failed to fetch thread",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /v1/search/similar/:documentId
 * Find similar documents using vector search
 */
search.get("/similar/:documentId", async (c) => {
  try {
    const documentId = c.req.param("documentId");
    const organizationId = getOrganizationId(c);
    const limit = c.req.query("limit");

    if (!organizationId) {
      return c.json({ error: "organization_id is required" }, 400);
    }

    const authContext = c.get("authContext");
    const accessControlIds = getACLIds(authContext);

    const documents = await searchService.findSimilar(
      documentId,
      organizationId,
      limit ? Number.parseInt(limit, 10) : 10,
      accessControlIds
    );
    searchQueriesCounter.inc({ endpoint: "similar" });

    return c.json({
      sourceDocumentId: documentId,
      similarDocuments: documents,
      count: documents.length,
    });
  } catch (error) {
    console.error("Similar documents error:", error);
    return c.json(
      {
        error: "Failed to find similar documents",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /v1/search/author/:authorId
 * Search documents by author
 */
search.get("/author/:authorId", async (c) => {
  try {
    const authorId = c.req.param("authorId");
    const organizationId = getOrganizationId(c);
    const limit = c.req.query("limit");

    if (!organizationId) {
      return c.json({ error: "organization_id is required" }, 400);
    }

    const authContext = c.get("authContext");
    const accessControlIds = getACLIds(authContext);

    const documents = await searchService.searchByAuthor(
      authorId,
      organizationId,
      limit ? Number.parseInt(limit, 10) : 50,
      accessControlIds
    );
    searchQueriesCounter.inc({ endpoint: "author" });

    return c.json({
      authorId,
      documents,
      count: documents.length,
    });
  } catch (error) {
    console.error("Author search error:", error);
    return c.json(
      {
        error: "Failed to search by author",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default search;
