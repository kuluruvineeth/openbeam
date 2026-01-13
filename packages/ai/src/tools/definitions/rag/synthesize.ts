import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

const ChunkSchema = z.object({
  content: z.string().min(1),
  documentId: z.string().min(1),
  documentTitle: z.string().optional(),
  documentUrl: z.string().optional(),
  position: z.number().int().min(0).optional(),
});

export const ragSynthesizeTool = defineTool({
  name: "rag_synthesize",
  description: `Synthesize an answer from pre-retrieved document chunks.

USE THIS WHEN:
- You already have document chunks from search_hybrid, doc_chunks, or other retrieval
- You want fine-grained control over which content informs the answer
- Building custom RAG pipelines with specific retrieval strategies
- Combining chunks from multiple searches before synthesis

DO NOT USE WHEN:
- You don't have chunks yet (use rag_answer for end-to-end RAG)
- Simple factual lookups (rag_answer handles retrieval automatically)
- You need to verify an existing answer (use rag_verify instead)

RETURNS: Synthesized answer with citations mapping claims to source chunks. Each citation includes the document ID, chunk index, and supporting snippet.`,
  category: "rag",
  deferLoading: false,
  searchKeywords: ["synthesize", "answer", "generate", "combine", "chunks"],

  parameters: z.object({
    question: z
      .string()
      .min(1)
      .describe("The question to answer based on the provided chunks"),
    chunks: z
      .array(ChunkSchema)
      .min(1)
      .max(50)
      .describe(
        "Document chunks to use as context. Each chunk should include content and documentId. Obtain from doc_chunks or search results."
      ),
    temperature: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.3)
      .describe(
        "Response creativity (0-1). Use 0.1-0.3 for factual accuracy, 0.5-0.7 for natural phrasing."
      ),
    maxOutputTokens: z
      .number()
      .min(100)
      .max(4000)
      .optional()
      .default(1000)
      .describe("Maximum tokens in the generated answer (100-4000)"),
    instructions: z
      .string()
      .optional()
      .describe(
        "Additional instructions for synthesis, e.g., 'Focus on technical details' or 'Summarize for executives'"
      ),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const totalContentLength = params.chunks.reduce(
      (sum, chunk) => sum + chunk.content.length,
      0
    );
    if (totalContentLength > 100_000) {
      return failure(
        "INVALID_INPUT",
        "Total chunk content exceeds maximum allowed size",
        { suggestion: "Reduce the number of chunks or use shorter excerpts" }
      );
    }

    const result = await ctx.services.rag.synthesize({
      question: params.question,
      chunks: params.chunks.map((chunk) => ({
        content: chunk.content,
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        documentUrl: chunk.documentUrl,
        position: chunk.position,
      })),
      temperature: params.temperature,
      maxOutputTokens: params.maxOutputTokens,
      instructions: params.instructions,
    });

    ctx.memory?.signal({
      type: "tool_succeeded",
      data: {
        tool: "rag_synthesize",
        question: params.question,
        chunkCount: params.chunks.length,
        citationCount: result.citations.length,
      },
      importance: "medium",
    });

    return success(
      {
        answer: result.answer,
        citations: result.citations.map((c, idx) => ({
          index: idx + 1,
          documentId: c.documentId,
          chunkIndex: c.chunkIndex,
          snippet: c.snippet,
          relevance: c.relevance,
        })),
        usage: result.usage,
        chunksUsed: params.chunks.length,
      },
      {
        latencyMs: result.latencyMs,
        source: "synthesizer",
        tokenCount: result.usage.totalTokens,
      }
    );
  },
});
