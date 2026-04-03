import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  type RankedSearchParams,
  rankedSearch,
  type SearchFilters,
  vespaClient,
} from "@openbeam/vespa";
import { z } from "zod";
import type { McpAuthContext } from "../middleware/auth";

const SearchDocumentsArgsSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(10),
  connector_types: z.array(z.string()).optional(),
  date_range: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
  author: z.string().optional(),
});

const SearchPeopleArgsSchema = z.object({
  query: z.string().min(1),
  department: z.string().optional(),
  limit: z.number().int().min(1).max(20).default(10),
});

export const searchTools: Tool[] = [
  {
    name: "search_documents",
    description:
      "Search across all connected enterprise data sources with hybrid ranking",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
        limit: {
          type: "number",
          description: "Maximum results to return (1-50)",
          default: 10,
        },
        connector_types: {
          type: "array",
          items: { type: "string" },
          description:
            "Filter by connector types (e.g. gmail, slack, confluence)",
        },
        date_range: {
          type: "object",
          properties: {
            start: {
              type: "string",
              description: "ISO 8601 start date",
            },
            end: {
              type: "string",
              description: "ISO 8601 end date",
            },
          },
          description: "Filter by date range",
        },
        author: {
          type: "string",
          description: "Filter by author name or email",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_people",
    description:
      "Search for people across connected enterprise data sources by name, email, or expertise",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for person name, email, or expertise",
        },
        department: {
          type: "string",
          description: "Filter by department",
        },
        limit: {
          type: "number",
          description: "Maximum results to return (1-20)",
          default: 10,
        },
      },
      required: ["query"],
    },
  },
];

const YQL_ESCAPE_RE = /["\\]/g;

function escapeYql(value: string): string {
  return value.replace(YQL_ESCAPE_RE, "\\$&");
}

function parseDateToEpoch(dateStr: string | undefined): number | undefined {
  if (!dateStr) {
    return;
  }
  const ms = Date.parse(dateStr);
  if (Number.isNaN(ms)) {
    return;
  }
  return Math.floor(ms / 1000);
}

export async function handleSearchTool(
  authContext: McpAuthContext,
  name: string,
  args: Record<string, unknown> | undefined
): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  try {
    switch (name) {
      case "search_documents": {
        const parsed = SearchDocumentsArgsSchema.parse(args);

        const filters: SearchFilters = {};
        if (parsed.connector_types) {
          filters.connectorTypes = parsed.connector_types;
        }
        if (parsed.date_range) {
          filters.dateRange = {
            start: parseDateToEpoch(parsed.date_range.start),
            end: parseDateToEpoch(parsed.date_range.end),
          };
        }

        const searchParams: RankedSearchParams = {
          query: parsed.query,
          teamId: authContext.teamId,
          limit: parsed.limit,
          filters,
          rankingProfile: "hybrid",
        };

        const result = await rankedSearch(searchParams);

        const documents = result.hits.map((hit) => ({
          id: hit.id,
          title: hit.document.title,
          snippet: (hit.document.content ?? "").slice(0, 300),
          score: hit.relevance,
          source: hit.document.connector_type,
          url: hit.document.url ?? null,
          author: hit.document.author_name ?? hit.document.author_email ?? null,
          updatedAt: hit.document.updated_at,
        }));

        const authorFilter = parsed.author?.toLowerCase();
        const filtered = authorFilter
          ? documents.filter(
              (d) => d.author?.toLowerCase().includes(authorFilter) ?? false
            )
          : documents;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query: parsed.query,
                  totalResults: result.pagination.totalResults,
                  results: filtered,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "search_people": {
        const parsed = SearchPeopleArgsSchema.parse(args);

        const { result } = await vespaClient.queryWithMetrics<{
          id: string;
          entity_type: string;
          name: string;
          email?: string;
          metadata?: Record<string, unknown>;
          is_active: boolean;
          team_id: string;
          updated_at: number;
        }>({
          yql: `select * from openbeam_entity where team_id contains "${escapeYql(authContext.teamId)}" and entity_type contains "person" and (name contains "${escapeYql(parsed.query)}" or email contains "${escapeYql(parsed.query)}")`,
          hits: parsed.limit,
          offset: 0,
          timeout: "5s",
        });

        const people = (result.root?.children ?? []).map((child) => {
          const meta = child.fields.metadata ?? {};
          return {
            id: child.fields.id,
            name: child.fields.name,
            email: child.fields.email ?? null,
            title: (meta.title as string) ?? null,
            department: (meta.department as string) ?? null,
            expertise: (meta.expertise as string[]) ?? [],
            activityScore: child.relevance,
          };
        });

        const deptFilter = parsed.department?.toLowerCase();
        const filtered = deptFilter
          ? people.filter(
              (p) => p.department?.toLowerCase().includes(deptFilter) ?? false
            )
          : people;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { query: parsed.query, results: filtered },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown search tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
}
