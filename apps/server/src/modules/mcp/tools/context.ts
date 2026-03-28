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
      outputSchema: {
        data: z.array(z.record(z.string(), z.any())),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const results = await Promise.resolve([] as unknown[]);

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
      outputSchema: {
        data: z.record(z.string(), z.any()),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async ({ uri: _uri }) => {
      const result = await Promise.resolve(null as unknown);

      if (!result) {
        return {
          content: [{ type: "text" as const, text: "Context entry not found" }],
          isError: true,
        };
      }

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
      outputSchema: {
        data: z.record(z.string(), z.any()),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async ({ question }) => {
      const result = await Promise.resolve({
        answer: `Placeholder answer for: "${question}". Connect the RAG engine to provide real answers.`,
        confidence: null,
        citations: [],
      });

      const clean = sanitize(mcpAnswerSchema, result);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to answer question")
  );
};
