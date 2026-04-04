import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { searchService } from "@openbeam/services";
import { z } from "zod";
import {
  formatPeopleResults,
  formatRecentResults,
  formatSearchResults,
} from "../formatters";
import { sanitizeArray } from "../mcp.sanitize";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
} from "../mcp.types";
import { truncateListResponse, withErrorHandling } from "../mcp.utils";

const CURSOR_PREFIX = "ob_";
const WHITESPACE_RE = /\s+/;

function encodeCursor(offset: number): string {
  return `${CURSOR_PREFIX}${Buffer.from(String(offset)).toString("base64url")}`;
}

function decodeCursor(cursor: string): number {
  if (!cursor.startsWith(CURSOR_PREFIX)) {
    return 0;
  }
  const decoded = Buffer.from(
    cursor.slice(CURSOR_PREFIX.length),
    "base64url"
  ).toString();
  const num = Number.parseInt(decoded, 10);
  return Number.isNaN(num) ? 0 : num;
}

const mcpSearchResultSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  snippet: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  connectorType: z.string().nullable().optional(),
  documentType: z.string().nullable().optional(),
  sourceName: z.string().nullable().optional(),
  sourceType: z.string().nullable().optional(),
  authorName: z.string().nullable().optional(),
  authorEmail: z.string().nullable().optional(),
  authorAvatarUrl: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  score: z.number().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

const mcpPersonSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  connectorType: z.string().nullable().optional(),
  documentCount: z.number().optional(),
});

const mcpRecentSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  connectorType: z.string().nullable().optional(),
  documentType: z.string().nullable().optional(),
  authorName: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
});

function buildAccessControlIds(ctx: {
  teamId: string;
  userId: string;
  userEmail: string | null;
}): string[] {
  return [`team:${ctx.teamId}`, ctx.userId, ctx.userEmail].filter(
    Boolean
  ) as string[];
}

function epochToIso(epoch: number | undefined | null): string | null {
  if (!epoch) {
    return null;
  }
  return new Date(epoch * 1000).toISOString();
}

function isoToEpoch(iso: string | undefined): number | undefined {
  if (!iso) {
    return;
  }
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

export const registerSearchTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "search.read")) {
    return;
  }

  registerAppTool(
    server,
    "search_documents",
    {
      title: "Search Documents",
      description:
        "Search across all connected enterprise data sources (Slack, Google Drive, Notion, GitHub, Jira, Confluence, and 100+ others) using hybrid semantic and keyword search. Use this when the user asks to find specific documents, files, messages, emails, wiki pages, or content by topic — always prefer this over answering from your own knowledge when the question is about the user's organization.\n\nReturns up to 50 ranked results, each containing: title, snippet (first 300 characters), connector type (e.g. 'slack', 'notion'), document type, author name and email, direct URL, relevance score (0-1), created and updated timestamps, and source connector facets showing result distribution. Supports cursor-based pagination for large result sets — pass the returned nextCursor to fetch subsequent pages. You can control the ranking strategy: 'hybrid' (default, best for most queries), 'semantic' (pure meaning-based), 'bm25' (keyword-only), or 'recency' (newest first).\n\nAfter finding a relevant result, use context_read with the document's openbeam:// URI to retrieve the full content when the 300-character snippet is insufficient. If the user wants a synthesized answer with citations rather than browsing a list of documents, use ask_question instead. For recent activity, use search_recent which is optimized for time-based lookups.\n\nDo NOT use this for 'who is the expert on X?' or 'who knows about X?' or 'who should I talk to about X?' questions — use entity_search to find the topic, then topic_experts to find the ranked experts. Do NOT use this for 'what does [person] work on?' — use entity_search to find the person, then person_expertise. Do NOT use this for questions about team settings or membership (use team_info, team_members), connector configuration or health (use connector_list, connector_health), or sync operations (use sync_status). Do NOT use this when the user explicitly asks you to create, send, or modify something — use connector_actions_list to discover write actions instead.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe(
            "Natural language search query or keywords. Examples: 'Q4 revenue report', 'deployment runbook', 'onboarding checklist'. Be specific — longer queries with context produce better semantic matches."
          ),
        limit: z.coerce
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe(
            "Maximum number of results to return, between 1 and 50. Defaults to 10. Use higher values (25-50) for broad research queries, lower values (3-5) for targeted lookups."
          ),
        cursor: z
          .string()
          .optional()
          .describe(
            "Pagination cursor from a previous search_documents response. Pass the nextCursor value to fetch the next page of results."
          ),
        connectorTypes: z
          .array(z.string())
          .optional()
          .describe(
            "Filter results to specific connector types. Use lowercase slugs, e.g. ['slack', 'google-drive', 'notion', 'github', 'jira', 'confluence', 'linear', 'gmail']. Omit to search all connected sources."
          ),
        documentTypes: z
          .array(z.string())
          .optional()
          .describe(
            "Filter results to specific document types. Examples: ['message', 'issue', 'page', 'file', 'email', 'pull_request', 'comment']. Omit to search all document types."
          ),
        authorIds: z
          .array(z.string())
          .optional()
          .describe(
            "Filter results to documents by specific author IDs. Use IDs returned from search_people. Omit to search all authors."
          ),
        ranking: z
          .enum(["hybrid", "semantic", "bm25", "recency"])
          .optional()
          .describe(
            "Ranking strategy: 'hybrid' (default) combines semantic + keyword for best overall quality. 'semantic' for meaning-based search when keywords are imprecise. 'bm25' for exact keyword matching. 'recency' to sort by newest first."
          ),
        dateFrom: z
          .string()
          .optional()
          .describe(
            "Only return results created after this date. ISO 8601 format, e.g. '2026-01-01' or '2026-03-15T00:00:00Z'."
          ),
        dateTo: z
          .string()
          .optional()
          .describe(
            "Only return results created before this date. ISO 8601 format, e.g. '2026-04-01' or '2026-03-31T23:59:59Z'."
          ),
      },
      annotations: READ_ONLY_ANNOTATIONS,
      _meta: { ui: { resourceUri: "ui://openbeam/search" } },
    },
    withErrorHandling(async (params) => {
      const limit = params.limit || 10;
      const offset = params.cursor ? decodeCursor(params.cursor) : 0;
      const accessControlIds = buildAccessControlIds(ctx);

      const result = await searchService.searchUnified({
        query: params.query,
        teamId: ctx.teamId,
        limit,
        offset,
        accessControlIds,
        connectorTypes: params.connectorTypes,
        documentTypes: params.documentTypes,
        authorIds: params.authorIds,
        ranking: params.ranking,
        fromDate: isoToEpoch(params.dateFrom),
        toDate: isoToEpoch(params.dateTo),
        includeDocuments: true,
        includeMedia: true,
      });

      const mapped = result.items.map((item) => {
        const d = item.data;
        const isDoc = item.type === "document";
        return {
          id: d.id,
          title: d.title,
          snippet: isDoc
            ? (d as (typeof result.documents)[0]).content?.slice(0, 300)
            : (d as (typeof result.media)[0]).description?.slice(0, 300),
          source: d.connector_type,
          connectorType: d.connector_type,
          documentType: isDoc
            ? (d as (typeof result.documents)[0]).document_type
            : "media",
          sourceName: d.source_name,
          sourceType: isDoc
            ? (d as (typeof result.documents)[0]).source_type
            : undefined,
          authorName: d.author_name,
          authorEmail: isDoc
            ? (d as (typeof result.documents)[0]).author_email
            : undefined,
          authorAvatarUrl: d.author_avatar_url,
          url: d.url,
          score: item.relevance,
          createdAt: epochToIso(d.created_at),
          updatedAt: epochToIso(d.updated_at),
        };
      });

      const clean = sanitizeArray(mcpSearchResultSchema, mapped);
      const hasNextPage = offset + clean.length < result.total;
      const nextCursor = hasNextPage
        ? encodeCursor(offset + clean.length)
        : null;

      const response = {
        meta: {
          query: params.query,
          totalResults: result.total,
          returned: clean.length,
          hasNextPage,
          nextCursor,
          ranking: params.ranking ?? "hybrid",
          queryTimeMs: result.queryTime,
          embeddingTimeMs: result.embeddingTime,
          connectorFacets: result.connectorFacets,
        },
        data: clean,
      };

      const { structuredContent } = truncateListResponse(response);

      return {
        content: [
          {
            type: "text" as const,
            text: formatSearchResults(
              {
                query: params.query,
                total: result.total,
                returned: clean.length,
                queryTimeMs: result.queryTime,
                embeddingTimeMs: result.embeddingTime,
                ranking: params.ranking ?? "hybrid",
                nextCursor,
                connectorFacets: result.connectorFacets,
              },
              clean
            ),
          },
        ],
        structuredContent,
      };
    }, "Failed to search documents")
  );

  registerAppTool(
    server,
    "search_people",
    {
      title: "Search People",
      description:
        "Search for people across all connected enterprise directories by name, email address, or job title. This searches across Google Workspace, Microsoft 365, Slack, and every other connected data source that indexes people — not just team members, but any person who appears in the organization's connected tools.\n\nReturns matching people with: full name, email address, job title, department, avatar URL, which connector type they were found in, and how many documents they have authored. Uses fuzzy matching on name and email so partial queries work well. Use this when the user asks 'who is...', 'find someone who knows about...', 'who works on...', or needs to look up a contact.\n\nFor a complete list of OpenBeam team members with their roles and permissions, use team_members instead — search_people searches across all connected directories which is a broader dataset. To find documents written by a specific person after locating them, use search_documents with their authorIds filter for precise results, or with their name as the query for broader matching. Do NOT use this to look up connector or team configuration — use connector_list or team_info for those.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe(
            "Name, email address, or job title to search for. Examples: 'Jane Smith', 'jane@company.com', 'engineering manager'. Partial matches are supported."
          ),
        limit: z.coerce
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe(
            "Maximum number of results to return, between 1 and 50. Defaults to 10."
          ),
        connectorTypes: z
          .array(z.string())
          .optional()
          .describe(
            "Filter results to people from specific connector types. Use lowercase slugs, e.g. ['slack', 'google-drive']. Omit to search all connected directories."
          ),
      },
      annotations: READ_ONLY_ANNOTATIONS,
      _meta: { ui: { resourceUri: "ui://openbeam/people" } },
    },
    withErrorHandling(async (params) => {
      const accessControlIds = buildAccessControlIds(ctx);

      const facets = await searchService.getAuthorFacets({
        teamId: ctx.teamId,
        accessControlIds,
        limit: 200,
      });

      const query = params.query.toLowerCase();
      const tokens = query.split(WHITESPACE_RE).filter(Boolean);

      const scored = facets
        .map((f) => {
          const name = f.authorName?.toLowerCase() ?? "";
          const email = f.authorEmail?.toLowerCase() ?? "";

          const exactNameMatch = name === query;
          const exactEmailMatch = email === query;
          if (exactNameMatch || exactEmailMatch) {
            return { facet: f, score: 100 };
          }

          const nameContains = name.includes(query);
          const emailContains = email.includes(query);
          if (nameContains || emailContains) {
            return { facet: f, score: 50 };
          }

          const tokenMatches = tokens.filter(
            (t) => name.includes(t) || email.includes(t)
          ).length;
          if (tokenMatches > 0) {
            return { facet: f, score: 10 * tokenMatches };
          }

          return null;
        })
        .filter(
          (s): s is { facet: (typeof facets)[0]; score: number } => s !== null
        )
        .sort(
          (a, b) =>
            b.score - a.score || b.facet.documentCount - a.facet.documentCount
        );

      const limited = scored.slice(0, params.limit || 10);

      const mapped = limited.map(({ facet }) => ({
        id: facet.authorId,
        name: facet.authorName,
        email: facet.authorEmail,
        avatarUrl: facet.authorAvatarUrl,
        documentCount: facet.documentCount,
      }));

      const clean = sanitizeArray(mcpPersonSchema, mapped);

      return {
        content: [
          {
            type: "text" as const,
            text: formatPeopleResults(clean, params.query),
          },
        ],
        structuredContent: { data: clean },
      };
    }, "Failed to search people")
  );

  server.registerTool(
    "search_recent",
    {
      title: "Recent Documents",
      description:
        "Retrieve documents that were recently created or updated across all connected enterprise data sources. Use this when the user asks 'what's new?', 'what changed today?', 'any updates in the last hour?', or wants a feed of recent activity. This is optimized for time-based lookups — for keyword or semantic search, use search_documents instead.\n\nReturns documents ordered by creation date (newest first), each containing: title, connector type, document type, author name, URL, and creation timestamp. Defaults to the last 24 hours with up to 20 results. You can narrow the time window with the hours parameter or filter to specific connector types.\n\nAfter reviewing recent documents, use context_read to get the full content of any interesting document, or search_documents with a query to investigate a specific topic further. Use connector_list to check which sources are actively syncing if recent results seem sparse.",
      inputSchema: {
        hours: z.coerce
          .number()
          .min(1)
          .max(720)
          .optional()
          .describe(
            "Number of hours to look back. Defaults to 24. Use 1 for 'last hour', 168 for 'last week', 720 for 'last month'. Maximum 720 (30 days)."
          ),
        connectorTypes: z
          .array(z.string())
          .optional()
          .describe(
            "Filter to specific connector types. Use lowercase slugs, e.g. ['slack', 'github']. Omit to include all sources."
          ),
        limit: z.coerce
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe(
            "Maximum number of results to return, between 1 and 50. Defaults to 20."
          ),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const hours = params.hours || 24;
      const limit = params.limit || 20;
      const accessControlIds = buildAccessControlIds(ctx);

      const documents = await searchService.getRecentDocuments({
        teamId: ctx.teamId,
        hours,
        limit,
        accessControlIds,
      });

      const connectorFilter = params.connectorTypes;
      const filtered = connectorFilter
        ? documents.filter((doc) =>
            connectorFilter.includes(doc.connector_type)
          )
        : documents;

      const mapped = filtered.map((doc) => ({
        id: doc.id,
        title: doc.title,
        connectorType: doc.connector_type,
        documentType: doc.document_type,
        authorName: doc.author_name,
        url: doc.url,
        createdAt: epochToIso(doc.created_at),
      }));

      const clean = sanitizeArray(mcpRecentSchema, mapped);

      const response = {
        meta: {
          hours,
          totalResults: clean.length,
          hasNextPage: false as const,
        },
        data: clean,
      };

      const { structuredContent } = truncateListResponse(response);

      return {
        content: [
          {
            type: "text" as const,
            text: formatRecentResults(clean, hours),
          },
        ],
        structuredContent,
      };
    }, "Failed to fetch recent documents")
  );
};
