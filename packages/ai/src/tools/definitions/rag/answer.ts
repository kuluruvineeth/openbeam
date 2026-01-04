import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const ragAnswerTool = defineTool({
  name: "rag_answer",
  description: `Generate a grounded answer to a question using retrieved documents.
Returns an answer with citations to source documents.
Use when you need to answer questions with evidence from the knowledge base.`,
  category: "rag",
  deferLoading: false,
  searchKeywords: ["answer", "question", "grounded", "citation", "evidence"],

  parameters: z.object({
    question: z.string().min(1).describe("The question to answer"),
    topK: z
      .number()
      .min(1)
      .max(20)
      .optional()
      .default(10)
      .describe("Number of documents to retrieve for context"),
    maxTokens: z
      .number()
      .min(1000)
      .max(32_000)
      .optional()
      .default(16_000)
      .describe("Maximum context tokens"),
    temperature: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.3)
      .describe("Response temperature"),
    includeMedia: z
      .boolean()
      .optional()
      .default(true)
      .describe("Include video/media transcripts"),
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
