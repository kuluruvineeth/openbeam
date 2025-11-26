/**
 * Search Tool
 *
 * Built-in tool for searching the knowledge base via Vespa.
 */

import { z } from "zod";
import { retriever } from "../../rag/retriever";
import { defineTool } from "../registry";

/**
 * Search parameters schema
 */
const searchParamsSchema = z.object({
  query: z.string().describe("The search query"),
  limit: z
    .number()
    .min(1)
    .max(20)
    .optional()
    .default(5)
    .describe("Number of results to return"),
  connectorTypes: z
    .array(z.string())
    .optional()
    .describe("Filter by connector types (e.g., 'SLACK', 'NOTION')"),
  documentTypes: z
    .array(z.string())
    .optional()
    .describe("Filter by document types (e.g., 'message', 'page')"),
  searchMode: z
    .enum(["hybrid", "semantic", "keyword"])
    .optional()
    .default("hybrid")
    .describe("Search mode"),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

/**
 * Search result type
 */
interface SearchResult {
  documents: Array<{
    id: string;
    title: string;
    content: string;
    url?: string;
    connectorType?: string;
    documentType?: string;
    authorName?: string;
    relevanceScore: number;
  }>;
  totalMatches: number;
  searchTimeMs: number;
}

/**
 * Search tool definition
 */
export const searchTool = defineTool<SearchParams, SearchResult>({
  name: "search",
  description:
    "Search the knowledge base for documents, messages, or other content. Use this to find information about any topic.",
  parameters: searchParamsSchema,
  category: "search",
  parallelizable: true,

  async execute(params, context): Promise<SearchResult> {
    const result = await retriever.retrieve(params.query, context.teamId, {
      topK: params.limit,
      connectorTypes: params.connectorTypes,
      documentTypes: params.documentTypes,
      searchMode: params.searchMode,
      accessControl: context.accessControl,
    });

    return {
      documents: result.documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content.slice(0, 500), // Truncate for tool response
        url: doc.url,
        connectorType: doc.connectorType,
        documentType: doc.documentType,
        authorName: doc.authorName,
        relevanceScore: doc.relevanceScore,
      })),
      totalMatches: result.totalMatches,
      searchTimeMs: result.searchTimeMs,
    };
  },
});

/**
 * Get document by ID tool
 */
const getDocumentParamsSchema = z.object({
  documentId: z.string().describe("The document ID to retrieve"),
});

type GetDocumentParams = z.infer<typeof getDocumentParamsSchema>;

export const getDocumentTool = defineTool<
  GetDocumentParams,
  { document: unknown } | { error: string }
>({
  name: "get_document",
  description: "Get the full content of a specific document by its ID.",
  parameters: getDocumentParamsSchema,
  category: "search",
  parallelizable: true,

  async execute(params, context) {
    const results = await retriever.retrieveByIds(
      [params.documentId],
      context.teamId
    );

    if (results.length === 0) {
      return { error: "Document not found" };
    }

    const doc = results[0];
    return {
      document: {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        url: doc.url,
        connectorType: doc.connectorType,
        documentType: doc.documentType,
        authorName: doc.authorName,
        authorId: doc.authorId,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        metadata: doc.metadata,
      },
    };
  },
});

/**
 * Find similar documents tool
 */
const findSimilarParamsSchema = z.object({
  documentId: z
    .string()
    .describe("The document ID to find similar documents for"),
  limit: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .default(5)
    .describe("Number of similar documents to return"),
});

type FindSimilarParams = z.infer<typeof findSimilarParamsSchema>;

export const findSimilarTool = defineTool<
  FindSimilarParams,
  { documents: unknown[] }
>({
  name: "find_similar",
  description: "Find documents similar to a given document.",
  parameters: findSimilarParamsSchema,
  category: "search",
  parallelizable: true,

  async execute(params, context) {
    const results = await retriever.retrieveSimilar(
      params.documentId,
      context.teamId,
      {
        limit: params.limit,
        accessControl: context.accessControl,
      }
    );

    return {
      documents: results.map((doc) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content.slice(0, 300),
        url: doc.url,
        relevanceScore: doc.relevanceScore,
      })),
    };
  },
});

export default searchTool;
