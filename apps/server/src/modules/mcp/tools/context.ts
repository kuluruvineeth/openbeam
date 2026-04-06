import { ragAnswer } from "@openbeam/services";
import type { ContextType } from "@openbeam/types/context";
import { z } from "zod";
import {
  formatAnswer,
  formatContextBrowse,
  formatContextDetail,
  formatContextSearch,
} from "../formatters";
import { sanitize, sanitizeArray } from "../mcp.sanitize";
import { getContextSearchService, getContextStore } from "../mcp.services";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
} from "../mcp.types";
import { truncateListResponse, withErrorHandling } from "../mcp.utils";

const MCP_RAG_PROMPT = `Answer questions using the provided context documents.

Rules:
- Answer ONLY from the provided context documents
- If context is insufficient, say "I couldn't find enough information to answer this"
- Cite sources by referencing document titles with [n] notation matching document order
- Be concise — prefer short paragraphs and bullet points
- Never fabricate information not in the context
- Use markdown formatting (bold, lists, code blocks)`;

const mcpContextEntrySchema = z.object({
  uri: z.string(),
  title: z.string().nullable().optional(),
  abstract: z.string().nullable().optional(),
  overview: z.string().nullable().optional(),
  contextType: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  score: z.number().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

const mcpContextDetailSchema = mcpContextEntrySchema.extend({
  content: z.string().nullable().optional(),
  parentUri: z.string().nullable().optional(),
  ownerType: z.string().nullable().optional(),
  activeCount: z.number().nullable().optional(),
  relations: z
    .array(
      z.object({
        targetUri: z.string(),
        reason: z.string().nullable().optional(),
      })
    )
    .nullable()
    .optional(),
});

const mcpBrowseEntrySchema = z.object({
  uri: z.string(),
  abstract: z.string().nullable().optional(),
  contextType: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  isLeaf: z.boolean().nullable().optional(),
  isDirectory: z.boolean().nullable().optional(),
  activeCount: z.number().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

const mcpAnswerSchema = z.object({
  answer: z.string(),
  confidence: z.number().nullable().optional(),
  citations: z
    .array(
      z.object({
        uri: z.string().nullable().optional(),
        title: z.string().nullable().optional(),
        snippet: z.string().nullable().optional(),
        source: z.string().nullable().optional(),
      })
    )
    .nullable()
    .optional(),
});

function buildRootDirectories(teamId: string, userId: string) {
  return [
    {
      uri: `openbeam://user/${teamId}/${userId}/memories/`,
      abstract: "Your accumulated memories — preferences, entities, events",
      contextType: "memory",
      isDirectory: true,
      isLeaf: false,
    },
    {
      uri: `openbeam://context/resources/${teamId}/`,
      abstract: "Enterprise data synced from connected sources",
      contextType: "resource",
      isDirectory: true,
      isLeaf: false,
    },
    {
      uri: `openbeam://tools/${teamId}/definitions/`,
      abstract: "Available tool definitions and execution stats",
      contextType: "tool",
      isDirectory: true,
      isLeaf: false,
    },
  ];
}

export const registerContextTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "context.read")) {
    return;
  }

  server.registerTool(
    "context_search",
    {
      title: "Search Context Database",
      description:
        "Search the OpenBeam context database — a hierarchical knowledge store containing memories, resources, skills, and tools. " +
        "Use this to find previously stored knowledge, recall user preferences, retrieve agent learnings, or locate enterprise resources by content. " +
        "Returns entries ranked by relevance and usage frequency with L0/L1 summaries for token efficiency. " +
        "After finding a relevant entry, use context_read with the returned URI to load full L2 content. " +
        "Do NOT use this for general document search — use search_documents instead. Do NOT use for synthesized answers — use ask_question.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe(
            "Natural language search query. Examples: 'deployment preferences', 'Jira workflow patterns'."
          ),
        contextType: z
          .enum(["resource", "memory", "skill", "tool"])
          .optional()
          .describe(
            "Filter by context type. 'resource' = synced docs. 'memory' = user/agent learnings. 'skill' = agent workflows. 'tool' = tool definitions."
          ),
        category: z
          .string()
          .optional()
          .describe(
            "Subcategory filter. For memories: 'preferences', 'entities', 'events', 'cases', 'patterns'."
          ),
        limit: z.coerce
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe("Max results (default 20, max 50)."),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const take = params.limit ?? 20;
      const store = getContextStore();
      const searchService = getContextSearchService();

      const entries = await searchService.find(params.query, ctx.teamId, {
        contextType: params.contextType as ContextType | undefined,
        limit: take,
      });

      await Promise.all(entries.map((e) => store.touch(ctx.teamId, e.uri)));

      const results = entries.map((e) => ({
        uri: e.uri,
        abstract: e.abstractText,
        overview: null,
        contextType: e.contextType,
        category: e.category,
        score: e.score,
        updatedAt: e.updatedAt.toISOString(),
      }));

      const data = sanitizeArray(mcpContextEntrySchema, results);

      const response = {
        meta: {
          query: params.query,
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
            text: formatContextSearch(params.query, data),
          },
        ],
        structuredContent,
      };
    }, "Failed to search context database")
  );

  server.registerTool(
    "context_read",
    {
      title: "Read Context Entry",
      description:
        "Read a specific context entry by its openbeam:// URI at configurable detail levels (L0/L1/L2) for token efficiency. " +
        "Use after context_search or context_browse when you need full content. " +
        "Level 0 = abstract (~100 tokens), level 1 = overview (~2K tokens), level 2 = full content (default). " +
        "Each read increments usage count, improving future search ranking. " +
        "Do NOT use for general search — use context_search or search_documents first.",
      inputSchema: {
        uri: z
          .string()
          .min(1)
          .describe(
            "The openbeam:// URI from context_search, context_browse, or a related entry."
          ),
        level: z
          .enum(["0", "1", "2"])
          .optional()
          .describe(
            "Detail level: '0' = abstract only, '1' = abstract + overview, '2' = full content (default)."
          ),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async ({ uri, level }) => {
      const store = getContextStore();
      const resolvedLevel = level ?? "2";

      const entry = await store.read(ctx.teamId, uri);

      if (!entry) {
        return {
          content: [{ type: "text" as const, text: "Context entry not found" }],
          isError: true,
        };
      }

      await store.touch(ctx.teamId, uri);

      const relations = await store.relations(ctx.teamId, uri);

      const result = {
        uri: entry.uri,
        abstract: entry.abstractText,
        overview: resolvedLevel >= "1" ? entry.overview : null,
        content: resolvedLevel >= "2" ? entry.content : null,
        contextType: entry.contextType,
        category: entry.category,
        parentUri: entry.parentUri,
        ownerType: entry.ownerType,
        activeCount: entry.activeCount,
        updatedAt: entry.updatedAt.toISOString(),
        relations: relations.map((r) => ({
          targetUri: r.targetUri,
          reason: r.reason,
        })),
      };

      const clean = sanitize(mcpContextDetailSchema, result);

      return {
        content: [{ type: "text" as const, text: formatContextDetail(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to read context entry")
  );

  server.registerTool(
    "context_browse",
    {
      title: "Browse Context Hierarchy",
      description:
        "Browse the openbeam:// namespace like a filesystem. Returns child entries at the given URI prefix. " +
        "Use without arguments to list root directories, or provide a parentUri to drill down. " +
        "Each result includes L0 abstract for quick scanning. " +
        "After browsing, use context_read with a leaf entry's URI for full content.",
      inputSchema: {
        parentUri: z
          .string()
          .optional()
          .describe(
            "Parent URI to list children of (e.g. 'openbeam://user/{teamId}/{userId}/memories/'). Omit to list root directories."
          ),
        contextType: z
          .enum(["resource", "memory", "skill", "tool"])
          .optional()
          .describe("Filter children by context type."),
        limit: z.coerce
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("Max entries to return (default 50)."),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const limit = params.limit ?? 50;

      if (!params.parentUri) {
        const roots = buildRootDirectories(ctx.teamId, ctx.userId);
        const data = sanitizeArray(mcpBrowseEntrySchema, roots);
        return {
          content: [
            { type: "text" as const, text: formatContextBrowse(null, data) },
          ],
          structuredContent: { data },
        };
      }

      const store = getContextStore();

      const children = await store.list(ctx.teamId, params.parentUri);

      const filtered = params.contextType
        ? children.filter((e) => e.contextType === params.contextType)
        : children;

      const entries = filtered.slice(0, limit).map((e) => ({
        uri: e.uri,
        abstract: e.abstractText,
        contextType: e.contextType,
        category: e.category,
        isLeaf: e.isLeaf,
        isDirectory: !e.isLeaf,
        activeCount: e.activeCount,
        updatedAt: e.updatedAt.toISOString(),
      }));

      const data = sanitizeArray(mcpBrowseEntrySchema, entries);
      const response = {
        meta: {
          parentUri: params.parentUri,
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
            text: formatContextBrowse(params.parentUri, data),
          },
        ],
        structuredContent,
      };
    }, "Failed to browse context hierarchy")
  );

  server.registerTool(
    "ask_question",
    {
      title: "Ask a Question",
      description:
        "Ask a natural language question and receive an AI-generated answer grounded in enterprise data with source citations. " +
        "Uses RAG to search connected sources, retrieve relevant documents, and synthesize a coherent answer. " +
        "Returns: answer text, confidence score (0-1), and citations with URIs for follow-up via context_read. " +
        "Filter with connectorTypes for domain-specific questions. " +
        "For browsing documents yourself, use search_documents instead.",
      inputSchema: {
        question: z
          .string()
          .min(1)
          .describe(
            "Natural language question. Be specific for better results. Examples: 'What is our deployment process?', 'How do we handle data deletion?'."
          ),
        connectorTypes: z
          .array(z.string())
          .optional()
          .describe(
            "Limit sources to specific connector types, e.g. ['slack', 'notion']. Omit to search all."
          ),
        maxSources: z.coerce
          .number()
          .min(1)
          .max(20)
          .optional()
          .describe(
            "Max source documents to consider (default 5, max 20). Higher for complex synthesis questions."
          ),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async ({ question, connectorTypes, maxSources }) => {
      const accessControlIds = [
        `team:${ctx.teamId}`,
        ctx.userId,
        ctx.userEmail,
      ].filter(Boolean) as string[];

      const ragResult = await ragAnswer({
        query: question,
        teamId: ctx.teamId,
        accessControlIds,
        connectorTypes,
        topK: maxSources ?? 5,
        systemPrompt: MCP_RAG_PROMPT,
      });

      const result = {
        answer: ragResult.answer,
        confidence:
          ragResult.citations.length > 0
            ? Math.min(
                ragResult.citations.reduce(
                  (sum, c) => sum + c.relevanceScore,
                  0
                ) / ragResult.citations.length,
                1
              )
            : null,
        citations: ragResult.citations.map((c) => ({
          uri: c.documentId
            ? `openbeam://resources/${ctx.teamId}/${c.documentId}`
            : null,
          title: c.title,
          snippet: c.snippet,
          source: c.connectorType ?? null,
        })),
      };

      const clean = sanitize(mcpAnswerSchema, result);

      return {
        content: [{ type: "text" as const, text: formatAnswer(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to answer question")
  );
};
