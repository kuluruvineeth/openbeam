import type { ContextType } from "@openbeam/types/context";
import { z } from "zod";
import {
  formatMemoryDelete,
  formatMemoryList,
  formatMemoryRecall,
  formatMemoryStore,
} from "../formatters";
import { sanitize, sanitizeArray } from "../mcp.sanitize";
import { getContextSearchService, getContextStore } from "../mcp.services";
import {
  DESTRUCTIVE_ANNOTATIONS,
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
  WRITE_ANNOTATIONS,
} from "../mcp.types";
import { truncateListResponse, withErrorHandling } from "../mcp.utils";

const MEMORY_CATEGORIES = [
  "preferences",
  "entities",
  "events",
  "cases",
  "patterns",
  "tools",
  "skills",
] as const;

const mcpMemorySchema = z.object({
  uri: z.string(),
  abstract: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  ownerType: z.string().nullable().optional(),
  activeCount: z.number().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

const mcpMemoryDetailSchema = mcpMemorySchema.extend({
  content: z.string().nullable().optional(),
  overview: z.string().nullable().optional(),
});

const TITLE_SPLIT_RE = /[.\n]/;
const SLUG_REPLACE_RE = /[^a-z0-9]+/g;
const SLUG_TRIM_RE = /^-|-$/g;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(SLUG_REPLACE_RE, "-")
    .replace(SLUG_TRIM_RE, "")
    .slice(0, 60);
}

interface MemoryUriParts {
  teamId: string;
  ownerId: string;
  ownerType: string;
  category: string;
  slug: string;
}

function buildMemoryUri(parts: MemoryUriParts): string {
  const prefix = parts.ownerType === "agent" ? "agent" : "user";
  return `openbeam://${prefix}/${parts.teamId}/${parts.ownerId}/memories/${parts.category}/${parts.slug}`;
}

export const registerMemoryTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "context.read")) {
    return;
  }

  server.registerTool(
    "memory_recall",
    {
      title: "Recall Memories",
      description:
        "Search for memories relevant to a query. Memories are accumulated knowledge from past conversations — " +
        "user preferences, known entities, decisions, agent-learned patterns. " +
        "Use to personalize responses and avoid re-asking known information. " +
        "Returns matching memories with content for immediate use. " +
        "For storing new memories, use memory_store. For browsing memory hierarchy, use context_browse.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe(
            "What to remember, e.g. 'dark mode preference', 'deployment contacts'."
          ),
        category: z
          .enum(MEMORY_CATEGORIES)
          .optional()
          .describe(
            "Filter: 'preferences' (settings), 'entities' (people/projects), 'events' (decisions), " +
              "'cases' (problem-solution pairs), 'patterns' (reusable processes), 'tools' (tool stats), 'skills' (workflows)."
          ),
        scope: z
          .enum(["user", "agent", "team"])
          .optional()
          .describe("Whose memories: 'user' (default), 'agent', or 'team'."),
        limit: z.coerce
          .number()
          .min(1)
          .max(30)
          .optional()
          .describe("Max memories to return (default 10)."),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const take = params.limit ?? 10;
      const scope = params.scope ?? "user";
      const searchService = getContextSearchService();
      const store = getContextStore();

      const entries = await searchService.find(params.query, ctx.teamId, {
        contextType: "memory" as ContextType,
        limit: take,
      });

      const filtered = params.category
        ? entries.filter((e) => e.category === params.category)
        : entries;

      await Promise.all(filtered.map((e) => store.touch(ctx.teamId, e.uri)));

      const results = filtered.map((e) => ({
        uri: e.uri,
        abstract: e.abstractText,
        content: null,
        category: e.category,
        ownerType: null,
        activeCount: e.activeCount,
        updatedAt: e.updatedAt.toISOString(),
      }));

      const data = sanitizeArray(mcpMemoryDetailSchema, results);
      const response = {
        meta: {
          query: params.query,
          scope,
          totalResults: data.length,
          hasNextPage: false,
        },
        data,
      };

      const { structuredContent } = truncateListResponse(response);
      return {
        content: [
          {
            type: "text" as const,
            text: formatMemoryRecall(params.query, scope, data),
          },
        ],
        structuredContent,
      };
    }, "Failed to recall memories")
  );

  server.registerTool(
    "memory_list",
    {
      title: "List Memories",
      description:
        "List all memories for the current user, optionally filtered by category. " +
        "Use to browse what the system knows about the user or agent. " +
        "Returns L0 abstracts for quick scanning. Use memory_recall for semantic search instead.",
      inputSchema: {
        category: z
          .enum(MEMORY_CATEGORIES)
          .optional()
          .describe("Filter by memory category."),
        scope: z
          .enum(["user", "agent", "team"])
          .optional()
          .describe("Whose memories: 'user' (default), 'agent', or 'team'."),
        limit: z.coerce
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("Max memories to return (default 30)."),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const take = params.limit ?? 30;
      const scope = params.scope ?? "user";
      const store = getContextStore();
      const ownerId = scope === "user" ? ctx.userId : ctx.teamId;
      const ownerType = scope === "team" ? "team" : scope;

      const parentUri = `openbeam://${ownerType === "agent" ? "agent" : "user"}/${ctx.teamId}/${ownerId}/memories/`;
      const baseUri = params.category
        ? `${parentUri}${params.category}/`
        : parentUri;

      const entries = await store.list(ctx.teamId, baseUri);

      const results = entries.slice(0, take).map((e) => ({
        uri: e.uri,
        abstract: e.abstractText,
        category: e.category,
        ownerType: e.ownerType,
        activeCount: e.activeCount,
        updatedAt: e.updatedAt.toISOString(),
      }));

      const data = sanitizeArray(mcpMemorySchema, results);
      const response = {
        meta: {
          scope,
          category: params.category ?? "all",
          totalResults: data.length,
          hasNextPage: false,
        },
        data,
      };

      const { structuredContent } = truncateListResponse(response);
      return {
        content: [
          {
            type: "text" as const,
            text: formatMemoryList(scope, params.category ?? null, data),
          },
        ],
        structuredContent,
      };
    }, "Failed to list memories")
  );

  if (!hasScope(ctx, "context.write")) {
    return;
  }

  server.registerTool(
    "memory_store",
    {
      title: "Store Memory",
      description:
        "Store a new memory for future recall. Use to save user preferences, important entities, " +
        "decisions, or learned patterns. Memories persist across sessions and are available to all MCP clients. " +
        "If a memory with the same derived URI already exists, it will be updated (upsert). " +
        "For storing non-memory context entries, use context_store instead.",
      inputSchema: {
        content: z.string().min(1).describe("The memory content to store."),
        category: z
          .enum(MEMORY_CATEGORIES)
          .describe(
            "Category: 'preferences', 'entities', 'events', 'cases', 'patterns', 'tools', 'skills'."
          ),
        title: z
          .string()
          .optional()
          .describe(
            "Short title for the memory (used as URI slug). Auto-derived from content if omitted."
          ),
        scope: z
          .enum(["user", "agent", "team"])
          .optional()
          .describe("Store as: 'user' (default), 'agent', or 'team' memory."),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const scope = params.scope ?? "user";
      const title =
        params.title ??
        params.content.split(TITLE_SPLIT_RE)[0]?.slice(0, 60) ??
        "untitled";
      const slug = slugify(title);
      const ownerType = scope === "team" ? "team" : scope;
      const ownerId = scope === "user" ? ctx.userId : ctx.teamId;
      const store = getContextStore();

      const uri = buildMemoryUri({
        teamId: ctx.teamId,
        ownerId,
        ownerType,
        category: params.category,
        slug,
      });

      const entry = await store.create({
        uri,
        teamId: ctx.teamId,
        ownerId,
        ownerType,
        contextType: "memory",
        category: params.category,
        isLeaf: true,
        abstractText: title,
        content: params.content,
      });

      const result = {
        uri: entry.uri,
        abstract: entry.abstractText,
        category: entry.category,
        ownerType: entry.ownerType,
        updatedAt: entry.updatedAt.toISOString(),
      };

      const clean = sanitize(mcpMemorySchema, result);
      return {
        content: [{ type: "text" as const, text: formatMemoryStore(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to store memory")
  );

  server.registerTool(
    "memory_delete",
    {
      title: "Delete Memory",
      description:
        "Delete a specific memory by its URI. Use when a memory is outdated, incorrect, or no longer relevant. " +
        "This is permanent — the memory cannot be recovered. " +
        "Get the URI from memory_list or memory_recall results.",
      inputSchema: {
        uri: z
          .string()
          .min(1)
          .describe(
            "The openbeam:// URI of the memory to delete (from memory_list or memory_recall)."
          ),
      },
      annotations: DESTRUCTIVE_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const store = getContextStore();
      const entry = await store.read(ctx.teamId, params.uri);

      if (!entry) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Memory not found or already deleted.",
            },
          ],
          isError: true,
        };
      }

      await store.delete(ctx.teamId, params.uri);

      return {
        content: [
          { type: "text" as const, text: formatMemoryDelete(params.uri) },
        ],
        structuredContent: { data: { uri: params.uri, deleted: true } },
      };
    }, "Failed to delete memory")
  );
};
