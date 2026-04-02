import { searchService } from "@openbeam/services";
import type { GenericDocument } from "@openbeam/vespa";
import { z } from "zod";
import {
  formatAuthorDocuments,
  formatSemanticResults,
  formatSimilarResults,
} from "../formatters";
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
  authorEmail: z.string().nullable().optional(),
  authorAvatarUrl: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  score: z.number().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
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

function mapDocument(doc: {
  id: string;
  title?: string | null;
  content?: string | null;
  connector_type?: string | null;
  document_type?: string | null;
  source_name?: string | null;
  source_type?: string | null;
  author_name?: string | null;
  author_email?: string | null;
  author_avatar_url?: string | null;
  url?: string | null;
  relevanceScore?: number;
  created_at?: number | null;
  updated_at?: number | null;
}) {
  return {
    id: doc.id,
    title: doc.title,
    snippet: doc.content?.slice(0, 300),
    source: doc.connector_type,
    connectorType: doc.connector_type,
    documentType: doc.document_type,
    sourceName: doc.source_name,
    sourceType: doc.source_type,
    authorName: doc.author_name,
    authorEmail: doc.author_email,
    authorAvatarUrl: doc.author_avatar_url,
    url: doc.url,
    score: doc.relevanceScore,
    createdAt: epochToIso(doc.created_at),
    updatedAt: epochToIso(doc.updated_at),
  };
}

export const registerSearchAdvancedTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "search.read")) {
    return;
  }

  server.registerTool(
    "search_semantic",
    {
      title: "Semantic Search",
      description:
        "Pure semantic search using embeddings. Finds conceptually similar content even without keyword matches. Use when the user describes a concept rather than specific terms — for example, 'how we handle customer escalations' will find relevant documents even if they never use the word 'escalation'.\n\nReturns up to 50 results ranked by semantic similarity, each containing: title, snippet (first 300 characters), source connector type, document type, author name, direct URL, relevance score (0-1), and last updated timestamp.\n\nFor keyword-heavy queries with exact terms the user wants to match (error codes, file names, specific phrases), use search_documents instead — it uses hybrid search which combines keywords with semantics. For finding documents similar to one you already have, use search_similar with the document ID.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe(
            "Natural language description of the concept to search for. Be descriptive — longer queries with context produce better semantic matches. Example: 'process for onboarding new enterprise customers' rather than just 'onboarding'."
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
            "Filter results to specific connector types. Use lowercase slugs, e.g. ['slack', 'google-drive', 'notion']. Omit to search all connected sources."
          ),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const accessControlIds = buildAccessControlIds(ctx);

      const result = await searchService.search({
        query: params.query,
        teamId: ctx.teamId,
        limit: params.limit || 10,
        connectorTypes: params.connectorTypes,
        accessControlIds,
        ranking: "semantic",
      });

      const mapped = result.documents.map(mapDocument);
      const clean = sanitizeArray(mcpSearchResultSchema, mapped);

      const response = {
        meta: {
          query: params.query,
          totalResults: result.total,
          ranking: "semantic" as const,
          hasNextPage: clean.length < result.total,
        },
        data: clean,
      };

      const { structuredContent } = truncateListResponse(response);

      return {
        content: [
          {
            type: "text" as const,
            text: formatSemanticResults(params.query, clean, result.total),
          },
        ],
        structuredContent,
      };
    }, "Failed to perform semantic search")
  );

  server.registerTool(
    "search_similar",
    {
      title: "Find Similar Documents",
      description:
        "Find documents semantically similar to a given document. Use after finding a relevant result with search_documents or search_semantic to discover related content across all connected sources.\n\nReturns up to 20 results ranked by similarity, each containing: title, snippet, source connector type, document type, author name, direct URL, and relevance score. The source document itself is excluded from results.\n\nRequires a document ID from a previous search result. If you only have a topic description, use search_semantic instead.",
      inputSchema: {
        documentId: z
          .string()
          .min(1)
          .describe(
            "The ID of the document to find similar content for. Use the 'id' field from a previous search_documents, search_semantic, or context_read result."
          ),
        limit: z.coerce
          .number()
          .min(1)
          .max(20)
          .optional()
          .describe(
            "Maximum number of similar documents to return, between 1 and 20. Defaults to 10."
          ),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const accessControlIds = buildAccessControlIds(ctx);

      const documents = await searchService.findSimilar({
        documentId: params.documentId,
        teamId: ctx.teamId,
        limit: params.limit || 10,
        accessControlIds,
      });

      const mapped = documents.map(mapDocument);
      const clean = sanitizeArray(mcpSearchResultSchema, mapped);

      const response = {
        meta: {
          sourceDocumentId: params.documentId,
          totalResults: clean.length,
          hasNextPage: false,
        },
        data: clean,
      };

      const { structuredContent } = truncateListResponse(response);

      return {
        content: [
          {
            type: "text" as const,
            text: formatSimilarResults(params.documentId, clean, clean.length),
          },
        ],
        structuredContent,
      };
    }, "Failed to find similar documents")
  );

  server.registerTool(
    "search_by_author",
    {
      title: "Search by Author",
      description:
        "Find all documents created or modified by a specific person. Use after search_people to drill into someone's contributions across all connected sources — Slack messages, Google Docs, Notion pages, GitHub PRs, Jira tickets, and more.\n\nReturns up to 50 results ordered by most recently updated, each containing: title, snippet, source connector type, document type, direct URL, and last updated timestamp.\n\nOptionally filter by a keyword query to narrow within that person's documents. Requires an author ID from a previous search_people result.",
      inputSchema: {
        authorId: z
          .string()
          .min(1)
          .describe(
            "The author's unique ID. Use the 'id' field from a search_people result."
          ),
        query: z
          .string()
          .optional()
          .describe(
            "Optional keyword query to filter within this author's documents. Example: 'deployment runbook'. Omit to return all documents by this person."
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
      const accessControlIds = buildAccessControlIds(ctx);
      const limit = params.limit || 20;

      let documents: GenericDocument[];

      if (params.query) {
        const result = await searchService.search({
          query: params.query,
          teamId: ctx.teamId,
          limit,
          accessControlIds,
          authorId: params.authorId,
        });
        documents = result.documents;
      } else {
        documents = await searchService.searchByAuthor({
          authorId: params.authorId,
          teamId: ctx.teamId,
          limit,
          accessControlIds,
        });
      }

      const mapped = documents.map(mapDocument);
      const clean = sanitizeArray(mcpSearchResultSchema, mapped);

      const response = {
        meta: {
          authorId: params.authorId,
          query: params.query ?? null,
          totalResults: clean.length,
          hasNextPage: false,
        },
        data: clean,
      };

      const { structuredContent } = truncateListResponse(response);

      return {
        content: [
          {
            type: "text" as const,
            text: formatAuthorDocuments(
              params.authorId,
              params.query ?? null,
              clean,
              clean.length
            ),
          },
        ],
        structuredContent,
      };
    }, "Failed to search documents by author")
  );
};
