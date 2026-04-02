import db, {
  findContextEntry,
  findContextRelations,
  incrementActiveCount,
} from "@openbeam/db";
import { ragAnswer } from "@openbeam/services";
import { z } from "zod";
import {
  formatAnswer,
  formatContextDetail,
  formatContextSearch,
} from "../formatters";
import { sanitize, sanitizeArray } from "../mcp.sanitize";
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

export const registerContextTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "context.read")) {
    return;
  }

  server.registerTool(
    "context_search",
    {
      title: "Search Context Database",
      description:
        "Search the OpenBeam context database — a hierarchical knowledge store containing memories (user preferences, learned patterns), resources (synced enterprise documents), skills (agent-learned workflows), and tools (tool definitions and execution stats). Use this to find previously stored knowledge, recall user preferences, retrieve agent learnings, or locate specific enterprise resources by content.\n\nReturns entries ranked by relevance and usage frequency, each containing: openbeam:// URI (unique identifier for context_read), abstract text (L0 one-sentence summary, ~100 tokens), overview (L1 core information, ~2K tokens), context type ('resource', 'memory', 'skill', 'tool'), category (e.g. 'preferences', 'entities', 'cases', 'patterns' for memories), and last updated timestamp. Results are token-efficient — L0/L1 summaries are included so you can assess relevance without loading full content.\n\nFilter by contextType to narrow scope (e.g. 'memory' for user preferences and learnings, 'resource' for synced documents, 'skill' for agent workflows) or by category for finer granularity. After finding a relevant entry, use context_read with the returned URI to load the full L2 content when you need complete details.\n\nDo NOT use this for general document search across connected data sources — use search_documents for that. Do NOT use this when the user wants a synthesized answer — use ask_question instead. The context database stores curated, summarized knowledge, while search_documents searches raw indexed content.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe(
            "Natural language search query to match against context entry abstracts and overviews. Examples: 'deployment preferences', 'Jira workflow patterns', 'user communication style'."
          ),
        contextType: z
          .enum(["resource", "memory", "skill", "tool"])
          .optional()
          .describe(
            "Filter by context type. 'resource' = synced enterprise documents and uploads. 'memory' = user preferences, entities, events, and agent learnings. 'skill' = agent-learned workflow patterns. 'tool' = tool definitions and execution statistics. Omit to search all types."
          ),
        category: z
          .string()
          .optional()
          .describe(
            "Filter by subcategory within a context type. For memories: 'preferences', 'entities', 'events', 'cases', 'patterns'. For tools: tool category names. Case-insensitive."
          ),
        limit: z.coerce
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe(
            "Maximum number of results to return, between 1 and 50. Defaults to 20. Use lower values (5-10) for targeted lookups, higher for broad exploration."
          ),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const take = params.limit ?? 20;

      const where: Record<string, unknown> = {
        teamId: ctx.teamId,
        abstractText: { contains: params.query, mode: "insensitive" },
      };

      if (params.contextType) {
        where.contextType = params.contextType;
      }

      if (params.category) {
        where.category = params.category;
      }

      const entries = await db.contextEntry.findMany({
        where,
        orderBy: [{ activeCount: "desc" }, { updatedAt: "desc" }],
        take,
      });

      const results = entries.map((e) => ({
        uri: e.uri,
        abstract: e.abstractText,
        overview: e.overview,
        contextType: e.contextType,
        category: e.category,
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
        "Read a specific context entry by its openbeam:// URI, with configurable detail level for token efficiency. Use this after context_search or search_documents when you need the full content of a specific entry, or when you have a known URI from a citation or relation link.\n\nReturns the entry's content at the requested level: level 0 returns only the abstract (~100 tokens, for quick relevance checks), level 1 returns the abstract plus overview (~2K tokens, for understanding without full detail), level 2 (default) returns everything including the complete original content (unbounded size). Also returns: URI, context type, category, parent URI (for hierarchical navigation), owner type ('user' or 'agent'), usage count (how often this entry has been accessed), last updated timestamp, and a list of related entries with their URIs and relationship reasons.\n\nThe URI comes from context_search results, search_documents results (as openbeam:// URIs), or from the relations list of another context_read response (for graph traversal). Request level 0 or 1 when you only need a summary — this significantly reduces token consumption for large documents. Each read increments the entry's usage count, which improves its ranking in future context_search results.\n\nDo NOT use this for general search — use context_search or search_documents to find entries first, then use this to read specific ones.",
      inputSchema: {
        uri: z
          .string()
          .min(1)
          .describe(
            "The openbeam:// URI of the context entry to read. Get this from context_search results, search_documents results, or from related entry URIs in a previous context_read response. Examples: 'openbeam://resources/team123/doc456', 'openbeam://user/team123/user456/memories/preferences/search-defaults'."
          ),
        level: z
          .enum(["0", "1", "2"])
          .optional()
          .describe(
            "Content detail level controlling token consumption. '0' = abstract only (~100 tokens, cheapest). '1' = abstract + overview (~2K tokens, good balance). '2' = full content (default, unbounded — can be very large for documents). Use '0' or '1' when scanning multiple entries for relevance before committing to reading full content."
          ),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async ({ uri, level }) => {
      const entry = await findContextEntry(db, ctx.teamId, uri);

      if (!entry) {
        return {
          content: [{ type: "text" as const, text: "Context entry not found" }],
          isError: true,
        };
      }

      await incrementActiveCount(db, ctx.teamId, uri);

      const relations = await findContextRelations(db, ctx.teamId, uri);

      const resolvedLevel = level ?? "2";

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
    "ask_question",
    {
      title: "Ask a Question",
      description:
        "Ask a natural language question and receive an AI-generated answer grounded in the team's enterprise data, complete with source citations. This uses retrieval-augmented generation (RAG) to search across all connected data sources, retrieve the most relevant documents, synthesize a coherent answer, and provide traceable source references. Use this when the user wants a DIRECT ANSWER to a question rather than a list of documents to browse.\n\nReturns: the synthesized answer text, a confidence score (0-1, based on average citation relevance — higher means the answer is better supported by source data), and an array of citations each containing an openbeam:// URI (for follow-up with context_read), document title, relevant snippet, and source connector type (e.g. 'slack', 'notion', 'google-drive'). If no relevant sources are found, the confidence score will be null.\n\nFilter sources with connectorTypes when the question is domain-specific (e.g. pass ['slack'] to only answer from Slack messages, or ['confluence', 'notion'] for wiki-based answers). Increase maxSources (up to 20) for complex questions that require synthesizing information from many documents.\n\nFor exploratory research where the user wants to browse all matching documents themselves, use search_documents instead. Use context_read to retrieve the full content of any citation's URI when the snippet is insufficient. Do NOT use this for non-question queries like 'show me recent Slack messages' — use search_documents for browsing and listing.",
      inputSchema: {
        question: z
          .string()
          .min(1)
          .describe(
            "The natural language question to answer. Be specific and include context for better results. Examples: 'What is our deployment process for production?', 'What were the key decisions from last week\\'s engineering sync?', 'How do we handle customer data deletion requests?'."
          ),
        connectorTypes: z
          .array(z.string())
          .optional()
          .describe(
            "Limit answer sources to specific connector types. Use lowercase slugs, e.g. ['slack', 'notion', 'confluence', 'google-drive']. Useful for domain-specific questions — e.g. ['slack'] for recent discussions, ['confluence', 'notion'] for documented processes. Omit to search all connected sources."
          ),
        maxSources: z.coerce
          .number()
          .min(1)
          .max(20)
          .optional()
          .describe(
            "Maximum number of source documents to retrieve and consider for the answer, between 1 and 20. Defaults to 5. Use higher values (10-20) for complex questions requiring synthesis across many documents, lower values (1-3) for simple factual lookups."
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
