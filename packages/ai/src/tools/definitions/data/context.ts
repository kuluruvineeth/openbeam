import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export const buildContextTool = defineTool({
  name: "build_context",
  description: `Build a structured context from search results for LLM consumption.
Aggregates and formats documents into an optimal context window.
Use when preparing context for generation tasks.`,
  category: "data",
  deferLoading: false,
  searchKeywords: ["context", "aggregate", "prepare", "format", "window"],

  parameters: z.object({
    documentIds: z
      .array(z.string())
      .min(1)
      .max(50)
      .describe("Document IDs to include in context"),
    maxTokens: z
      .number()
      .min(100)
      .max(128_000)
      .optional()
      .default(8000)
      .describe("Maximum token budget for context"),
    strategy: z
      .enum(["truncate", "summarize", "chunk_priority"])
      .optional()
      .default("truncate")
      .describe("Strategy when content exceeds budget"),
    includeMetadata: z
      .boolean()
      .optional()
      .default(true)
      .describe("Include document metadata in context"),
  }),

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Context building requires multiple conditional paths
  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const documents = await Promise.all(
      params.documentIds.map((id) => ctx.services.documents.get(id))
    );

    const validDocs = documents.filter(
      (doc): doc is NonNullable<typeof doc> =>
        doc !== null && doc.teamId === ctx.teamId
    );

    if (validDocs.length === 0) {
      return failure("NOT_FOUND", "No valid documents found");
    }

    let totalTokens = 0;
    let truncated = false;
    const contextParts: string[] = [];

    for (const doc of validDocs) {
      const header = params.includeMetadata
        ? `[Document: ${doc.title}${doc.url ? ` | URL: ${doc.url}` : ""}${doc.connectorType ? ` | Source: ${doc.connectorType}` : ""}]\n`
        : `[${doc.title}]\n`;

      const content = doc.content || "";
      const headerTokens = estimateTokens(header);
      const contentTokens = estimateTokens(content);

      if (totalTokens + headerTokens + contentTokens <= params.maxTokens) {
        contextParts.push(`${header}${content}`);
        totalTokens += headerTokens + contentTokens;
      } else {
        const remaining = params.maxTokens - totalTokens - headerTokens;
        if (remaining > 100 && params.strategy === "truncate") {
          const truncatedContent = content.slice(0, remaining * 4);
          contextParts.push(`${header}${truncatedContent}...`);
          totalTokens += headerTokens + estimateTokens(truncatedContent);
          truncated = true;
        }
        break;
      }
    }

    const context = contextParts.join("\n\n---\n\n");

    return success(
      {
        context,
        documentCount: validDocs.length,
        includedDocuments: validDocs.length,
        tokenCount: totalTokens,
        truncated,
      },
      {
        latencyMs: performance.now() - startTime,
        source: "context-builder",
      }
    );
  },
});
