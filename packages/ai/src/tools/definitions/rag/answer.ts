import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const ragAnswerTool = defineTool({
  name: "rag_answer",
  description: `Generate a grounded answer to a question using retrieved enterprise documents with citations.

USE THIS WHEN:
- User asks a question that requires factual information from the knowledge base
- Answer must be backed by evidence from connected data sources
- User wants a synthesized answer from multiple documents
- Questions like "What is our vacation policy?", "How do we handle X?", "What did the team decide about Y?"

DO NOT USE WHEN:
- User wants to browse/explore documents (use search_hybrid or search_semantic)
- Question is about general knowledge not in the knowledge base (respond directly)
- User wants raw document content (use doc_get)
- User wants to find similar documents (use search_similar)

RETURNS: A grounded answer with citations linking claims to source documents. Each citation includes the document ID, title, URL, and the relevant snippet. If no relevant documents exist, returns a clear refusal rather than hallucinating.`,
  category: "rag",
  deferLoading: false,
  searchKeywords: ["answer", "question", "grounded", "citation", "evidence"],

  parameters: z.object({
    question: z
      .string()
      .min(1)
      .describe(
        "The question to answer. Phrase as a clear question. Examples: 'What is our remote work policy?', 'How do I request time off?', 'What were the key decisions from the Q3 planning meeting?'"
      ),
    topK: z
      .number()
      .min(1)
      .max(20)
      .optional()
      .default(10)
      .describe(
        "Number of documents to retrieve for context (1-20). Higher values provide more context but increase latency and cost. Use 5-10 for focused questions, 15-20 for broad topics."
      ),
    maxTokens: z
      .number()
      .min(1000)
      .max(32_000)
      .optional()
      .default(16_000)
      .describe(
        "Maximum context tokens to include (1000-32000). Higher values allow more document content but increase cost. Default 16000 balances coverage and efficiency."
      ),
    temperature: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.3)
      .describe(
        "Response creativity (0-1). Use 0.1-0.3 for factual accuracy, 0.5-0.7 for more natural phrasing. Default 0.3 prioritizes accuracy."
      ),
    includeMedia: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        "Include video/audio transcripts in search. Enable for comprehensive answers, disable to focus on text documents only."
      ),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const result = await ctx.services.rag.answer({
      query: params.question,
      teamId: ctx.teamId,
      topK: params.topK,
      maxTokens: params.maxTokens,
      temperature: params.temperature,
      accessControlIds: ctx.accessControl,
      includeMedia: params.includeMedia,
    });

    return success(
      {
        answer: result.answer,
        citations: result.citations.map((c) => ({
          documentId: c.documentId,
          title: c.title,
          url: c.url,
          snippet: c.snippet,
          source: c.connectorType,
          score: c.relevanceScore,
        })),
        context: {
          documentCount: result.context.documentCount,
          totalTokens: result.context.totalTokens,
          truncated: result.context.truncated,
        },
        usage: result.usage,
      },
      {
        latencyMs: result.latencyMs,
        source: "rag",
        tokenCount: result.usage.totalTokens,
      }
    );
  },
});
