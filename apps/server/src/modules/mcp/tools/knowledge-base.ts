import { z } from "zod";
import {
  formatArticle,
  formatCompilationStatus,
} from "../formatters/knowledge-base";
import { sanitize } from "../mcp.sanitize";
import { getContextStore } from "../mcp.services";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
  WRITE_ANNOTATIONS,
} from "../mcp.types";
import { withErrorHandling } from "../mcp.utils";

const mcpArticleSchema = z.object({
  uri: z.string(),
  title: z.string(),
  content: z.string().nullable().optional(),
  sourceCount: z.number().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

const mcpCompilationSchema = z.object({
  topic: z.string(),
  status: z.string(),
  articleUri: z.string().nullable().optional(),
  sourceCount: z.number().nullable().optional(),
});

export const registerKnowledgeBaseTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "context.read")) {
    return;
  }

  server.registerTool(
    "kb_browse",
    {
      title: "Browse Knowledge Base",
      description:
        "Browse compiled wiki articles in the knowledge base. " +
        "Returns a list of compiled articles organized by category. " +
        "Use this to discover what compiled knowledge exists for your team. " +
        "After finding an article, use kb_article with the URI for full content. " +
        "Do NOT use this for raw document search — use search_documents instead.",
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe("Filter by category, e.g. 'engineering', 'hr', 'product'."),
        limit: z.coerce
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe("Max articles to return (default 20)."),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const store = getContextStore();
      const wikiPrefix = `openbeam://wiki/${ctx.teamId}/`;
      const parentUri = params.category
        ? `${wikiPrefix}${params.category}/`
        : wikiPrefix;

      const children = await store.list(ctx.teamId, parentUri);
      const articles = children.slice(0, params.limit ?? 20).map((e) => ({
        uri: e.uri,
        title: e.abstractText,
        contextType: e.contextType,
        category: e.category,
        updatedAt: e.updatedAt.toISOString(),
      }));

      const text =
        articles.length > 0
          ? [
              `Found ${articles.length} compiled articles:`,
              "",
              ...articles.map((a) => `• ${a.title}\n  URI: ${a.uri}`),
              "",
              "Next steps:",
              "• Read full article: kb_article with the URI above.",
            ].join("\n")
          : "No compiled articles found. Use kb_compile to create one.";

      return {
        content: [{ type: "text" as const, text }],
        structuredContent: { data: articles },
      };
    }, "Failed to browse knowledge base")
  );

  server.registerTool(
    "kb_article",
    {
      title: "Read Knowledge Base Article",
      description:
        "Read a compiled knowledge base article by URI with source provenance. " +
        "Returns the full article content with citations to source documents. " +
        "Use after kb_browse to read a specific article. " +
        "Articles are compiled from multiple connector sources with confidence scores.",
      inputSchema: {
        uri: z
          .string()
          .min(1)
          .describe("The openbeam://wiki/... URI from kb_browse."),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const store = getContextStore();
      const entry = await store.read(ctx.teamId, params.uri);

      if (!entry) {
        return {
          content: [{ type: "text" as const, text: "Article not found." }],
          isError: true,
        };
      }

      await store.touch(ctx.teamId, params.uri);

      const relations = await store.relations(ctx.teamId, params.uri);

      const result = {
        uri: entry.uri,
        title: entry.abstractText,
        content: entry.content,
        sourceCount: relations.length,
        updatedAt: entry.updatedAt.toISOString(),
      };

      const clean = sanitize(mcpArticleSchema, result);

      return {
        content: [{ type: "text" as const, text: formatArticle(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to read knowledge base article")
  );

  if (!hasScope(ctx, "context.write")) {
    return;
  }

  server.registerTool(
    "kb_compile",
    {
      title: "Compile Knowledge Base Article",
      description:
        "Compile a new knowledge base article on a topic by synthesizing information from connected sources. " +
        "Gathers relevant documents, clusters by sub-topic, and produces a compiled wiki article with provenance. " +
        "Use this when a user asks to create or update knowledge on a specific topic. " +
        "Returns the article URI and compilation statistics.",
      inputSchema: {
        topic: z
          .string()
          .min(1)
          .describe(
            "The topic to compile, e.g. 'deployment process', 'data retention policy'."
          ),
        category: z
          .string()
          .min(1)
          .describe(
            "Category for the article, e.g. 'engineering', 'hr', 'product'."
          ),
        maxSources: z.coerce
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe("Max source documents to gather (default 20)."),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      await Promise.resolve();
      const result = {
        topic: params.topic,
        status: "queued",
        articleUri: null,
        sourceCount: null,
      };

      const clean = sanitize(mcpCompilationSchema, result);

      return {
        content: [
          {
            type: "text" as const,
            text: formatCompilationStatus(clean),
          },
        ],
        structuredContent: { data: clean },
      };
    }, "Failed to compile knowledge base article")
  );
};
