import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { hybridSearch, searchService } from "@openbeam/services";
import { z } from "zod";
import { formatPeopleResults, formatSearchResults } from "../formatters";
import { sanitizeArray } from "../mcp.sanitize";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
} from "../mcp.types";
import { truncateListResponse, withErrorHandling } from "../mcp.utils";

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
  authorAvatarUrl: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  score: z.number().nullable().optional(),
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
});

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
        "Search across all connected enterprise data sources using hybrid semantic + keyword search. This is the PRIMARY tool for answering factual questions about the user's organization — use it BEFORE attempting to answer from your own knowledge.\n\nReturns up to 50 ranked results, each with: title, snippet (first 300 chars), source connector type, author, URL, and relevance score. Filter by connector type (e.g. 'slack', 'google-drive', 'notion') or date range.\n\nAfter getting results, use context_read with the document's openbeam:// URI to retrieve the full content when snippets are insufficient. Use ask_question instead when the user wants a synthesized answer with citations rather than a list of documents.\n\nDo NOT use this for questions about team settings, connector status, or sync operations — use team_info, connector_list, or sync_status for those.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("The search query — natural language or keywords"),
        limit: z.coerce
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe("Max results to return (1-50, default 10)"),
        connectorTypes: z
          .array(z.string())
          .optional()
          .describe(
            "Filter by connector type slugs (e.g. ['slack', 'google-drive', 'notion'])"
          ),
        dateFrom: z
          .string()
          .optional()
          .describe("Filter results updated after this date (ISO 8601)"),
        dateTo: z
          .string()
          .optional()
          .describe("Filter results updated before this date (ISO 8601)"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
      _meta: { ui: { resourceUri: "ui://openbeam/search" } },
    },
    withErrorHandling(async (params) => {
      const accessControlIds = [
        `team:${ctx.teamId}`,
        ctx.userId,
        ctx.userEmail,
      ].filter(Boolean) as string[];

      const result = await hybridSearch({
        query: params.query,
        teamId: ctx.teamId,
        limit: params.limit || 10,
        connectorTypes: params.connectorTypes,
        accessControlIds,
      });

      const mapped = result.documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        snippet: doc.content?.slice(0, 300),
        source: doc.connector_type,
        connectorType: doc.connector_type,
        documentType: doc.document_type,
        sourceName: doc.source_name,
        sourceType: doc.source_type,
        authorName: doc.author_name,
        authorAvatarUrl: doc.author_avatar_url,
        url: doc.url,
        score: doc.relevanceScore,
        updatedAt: doc.updated_at
          ? new Date(doc.updated_at * 1000).toISOString()
          : null,
      }));

      const clean = sanitizeArray(mcpSearchResultSchema, mapped);

      const response = {
        meta: {
          query: params.query,
          totalResults: result.total,
          hasNextPage: clean.length < result.total,
        },
        data: clean,
      };

      const { structuredContent } = truncateListResponse(response);

      return {
        content: [
          {
            type: "text" as const,
            text: formatSearchResults(params.query, clean, result.total),
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
        'Search for people across connected enterprise directories by name, email, or title. Finds team members, contacts, and collaborators from Google Workspace, Microsoft 365, Slack, and other connectors.\n\nReturns matching people with: name, email, avatar URL, and connector type. Use this when the user asks "who works on X" or "find someone who knows about Y."\n\nFor a complete list of team members with roles, use team_members instead. To find documents authored by a specific person, use search_documents with their name as the query.',
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Name, email, or title to search for"),
        limit: z.coerce
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe("Max results to return (1-50, default 10)"),
        connectorTypes: z
          .array(z.string())
          .optional()
          .describe("Filter by connector type slugs"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
      _meta: { ui: { resourceUri: "ui://openbeam/people" } },
    },
    withErrorHandling(async (params) => {
      const facets = await searchService.getAuthorFacets({
        teamId: ctx.teamId,
        limit: 100,
      });

      const query = params.query.toLowerCase();
      const filtered = facets.filter((f) => {
        const name = f.authorName?.toLowerCase() ?? "";
        const email = f.authorEmail?.toLowerCase() ?? "";
        return name.includes(query) || email.includes(query);
      });

      const limited = filtered.slice(0, params.limit || 10);

      const mapped = limited.map((facet) => ({
        id: facet.authorId,
        name: facet.authorName,
        email: facet.authorEmail,
        avatarUrl: facet.authorAvatarUrl,
      }));

      const clean = sanitizeArray(mcpPersonSchema, mapped);

      return {
        content: [{ type: "text" as const, text: formatPeopleResults(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to search people")
  );
};
