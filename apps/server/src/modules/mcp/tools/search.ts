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
        "Search across all connected enterprise data sources (Slack, Google Drive, Notion, GitHub, Jira, Confluence, and 100+ others) using hybrid semantic and keyword search. Use this as the PRIMARY tool when the user asks to find documents, files, messages, emails, wiki pages, or any content across their connected workplace tools — always prefer this over answering from your own knowledge when the question is about the user's organization.\n\nReturns up to 50 ranked results, each containing: title, snippet (first 300 characters of content), source connector type (e.g. 'slack', 'google-drive'), document type, author name, direct URL to the original source, relevance score (0-1), and last updated timestamp. You can narrow results by filtering on connectorTypes (e.g. ['slack', 'notion']) or restricting to a date range with dateFrom/dateTo in ISO 8601 format.\n\nAfter finding a relevant result, use context_read with the document's openbeam:// URI to retrieve the full content when the 300-character snippet is insufficient. If the user wants a synthesized answer with citations rather than browsing a list of documents, use ask_question instead.\n\nDo NOT use this for questions about team settings or membership (use team_info, team_members), connector configuration or health (use connector_list, connector_health), or sync operations (use sync_status). Do NOT use this when the user explicitly asks you to create, send, or modify something — use connector_actions_list to discover write actions instead.",
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
        connectorTypes: z
          .array(z.string())
          .optional()
          .describe(
            "Filter results to specific connector types. Use lowercase slugs, e.g. ['slack', 'google-drive', 'notion', 'github', 'jira', 'confluence', 'linear', 'gmail']. Omit to search all connected sources."
          ),
        dateFrom: z
          .string()
          .optional()
          .describe(
            "Only return results updated after this date. ISO 8601 format, e.g. '2026-01-01' or '2026-03-15T00:00:00Z'."
          ),
        dateTo: z
          .string()
          .optional()
          .describe(
            "Only return results updated before this date. ISO 8601 format, e.g. '2026-04-01' or '2026-03-31T23:59:59Z'."
          ),
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
        "Search for people across all connected enterprise directories by name, email address, or job title. This searches across Google Workspace, Microsoft 365, Slack, and every other connected data source that indexes people — not just team members, but any person who appears in the organization's connected tools.\n\nReturns matching people with: full name, email address, job title, department, avatar URL, and which connector type they were found in (e.g. 'google-drive', 'slack'). Use this when the user asks 'who is...', 'find someone who knows about...', 'who works on...', or needs to look up a contact.\n\nFor a complete list of OpenBeam team members with their roles and permissions, use team_members instead — search_people searches across all connected directories which is a broader dataset. To find documents written by a specific person after locating them, use search_documents with their name as the query. Do NOT use this to look up connector or team configuration — use connector_list or team_info for those.",
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
