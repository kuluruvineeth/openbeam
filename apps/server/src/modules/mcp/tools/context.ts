import db, {
  findContextEntry,
  findContextRelations,
  incrementActiveCount,
} from "@openbeam/db";
import { ragAnswer } from "@openbeam/services";
import { z } from "zod";
import { sanitize, sanitizeArray } from "../mcp.sanitize";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
} from "../mcp.types";
import { truncateListResponse, withErrorHandling } from "../mcp.utils";

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
        "Search the context database using hierarchical retrieval. Finds memories, resources, skills, and tools ranked by semantic relevance and usage frequency. Uses L0/L1 tiered loading for token efficiency.",
      inputSchema: {
        query: z.string().min(1).describe("Natural language search query"),
        contextType: z
          .enum(["resource", "memory", "skill", "tool"])
          .optional()
          .describe("Filter by context type"),
        category: z
          .string()
          .optional()
          .describe(
            "Filter by category (e.g. preferences, entities, cases, patterns)"
          ),
        limit: z.coerce
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe("Max results (1-50, default 10)"),
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

      const { text, structuredContent } = truncateListResponse(response);

      return {
        content: [{ type: "text" as const, text }],
        structuredContent,
      };
    }, "Failed to search context database")
  );

  server.registerTool(
    "context_read",
    {
      title: "Read Context Entry",
      description:
        "Read a context entry by its openbeam:// URI. Returns the full content (L2) including metadata, relations, and the complete original content. Use after context_search to get full details.",
      inputSchema: {
        uri: z
          .string()
          .min(1)
          .describe(
            "The openbeam:// URI of the context entry (e.g. openbeam://resources/team123/doc456)"
          ),
        level: z
          .enum(["0", "1", "2"])
          .optional()
          .describe(
            "Content level: 0 = abstract only, 1 = overview, 2 = full content (default: 2)"
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
        content: [{ type: "text" as const, text: JSON.stringify(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to read context entry")
  );

  server.registerTool(
    "ask_question",
    {
      title: "Ask a Question",
      description:
        "Ask a natural language question and get an AI-generated answer grounded in your enterprise data. Uses RAG (retrieval-augmented generation) to search across all connected sources and provide an answer with citations.",
      inputSchema: {
        question: z.string().min(1).describe("The question to answer"),
        connectorTypes: z
          .array(z.string())
          .optional()
          .describe("Limit answer sources to specific connector types"),
        maxSources: z.coerce
          .number()
          .min(1)
          .max(20)
          .optional()
          .describe("Max source documents to consider (1-20, default 5)"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async ({ question, maxSources }) => {
      const accessControlIds = [
        `team:${ctx.teamId}`,
        ctx.userId,
        ctx.userEmail,
      ].filter(Boolean) as string[];

      const ragResult = await ragAnswer({
        query: question,
        teamId: ctx.teamId,
        accessControlIds,
        topK: maxSources ?? 5,
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
        content: [{ type: "text" as const, text: clean.answer }],
        structuredContent: { data: clean },
      };
    }, "Failed to answer question")
  );
};
