import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const docGetTool = defineTool({
  name: "doc_get",
  description: `Retrieve a specific document by ID with full content and metadata.

USE THIS WHEN:
- You have a document ID from a previous search result and need full content
- User asks to "read", "show", or "open" a specific document
- You need complete document text for detailed analysis
- Following up on a search result to get more context
- User references a document by name and you found its ID via search

DO NOT USE WHEN:
- You don't have a document ID (use search_hybrid to find documents first)
- You only need a snippet or summary (search results include snippets)
- User wants to find documents (use search_hybrid or search_semantic)
- You need to compare multiple documents (use search_similar or rag_answer)

RETURNS: Full document including title, content, URL, metadata, author, and optionally chunked segments for long documents.`,
  category: "documents",
  deferLoading: false,
  searchKeywords: ["document", "get", "retrieve", "fetch", "read"],

  parameters: z.object({
    documentId: z
      .string()
      .describe(
        "The document ID to retrieve. Obtain this from search results or previous tool calls. Format: UUID or connector-specific ID."
      ),
    includeChunks: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Include individual text chunks with token counts. Enable for long documents when you need to process sections individually."
      ),
    maxContentLength: z
      .number()
      .optional()
      .describe(
        "Truncate content to this character length. Use for previews or when full content isn't needed. Omit for complete content."
      ),
  }),

  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const doc = await ctx.services.documents.get(params.documentId);

    if (!doc) {
      return failure("NOT_FOUND", `Document not found: ${params.documentId}`);
    }

    if (doc.teamId !== ctx.teamId) {
      return failure("UNAUTHORIZED", "Document belongs to different team");
    }

    let content = doc.content || "";
    if (params.maxContentLength && content.length > params.maxContentLength) {
      content = `${content.slice(0, params.maxContentLength)}...`;
    }

    const chunks = params.includeChunks
      ? (await ctx.services.documents.getChunks(params.documentId)).map(
          (c) => ({
            index: c.position,
            content: c.content,
            tokenCount: c.tokenCount,
          })
        )
      : undefined;

    ctx.memory?.signalDocumentView(doc.id, doc.title);

    return success(
      {
        document: {
          id: doc.id,
          title: doc.title,
          content,
          url: doc.url,
          connectorType: doc.connectorType,
          documentType: doc.documentType,
          author: doc.authorName,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          sourceName: doc.sourceName,
        },
        found: true,
        chunks,
      },
      {
        latencyMs: performance.now() - startTime,
        source: "vespa",
      }
    );
  },
});
