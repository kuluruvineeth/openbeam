import { z } from "zod";
import { RAGEngine } from "../../../rag/engine";
import type { RAGChunk } from "../../../rag/types";
import { defineTool, failure, success } from "../../builder";

const ChunkSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  documentTitle: z.string(),
  documentUrl: z.string().optional(),
  sourceType: z.string(),
  content: z.string(),
  score: z.number(),
  tokenCount: z.number().optional(),
  startOffset: z.number().optional(),
  endOffset: z.number().optional(),
});

export const pureRagAnswerTool = defineTool({
  name: "answer_with_chunks",
  description: `Generate a grounded answer using provided document chunks.
Takes pre-retrieved chunks and generates an answer with citations.
Use when you already have relevant chunks and need to synthesize an answer.`,
  category: "rag",
  deferLoading: false,
  searchKeywords: ["answer", "rag", "grounded", "citation", "synthesize"],

  parameters: z.object({
    question: z.string().min(1).describe("The question to answer"),
    chunks: z
      .array(ChunkSchema)
      .min(1)
      .describe("Document chunks to use as context"),
    temperature: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.3)
      .describe("Response temperature"),
    maxContextTokens: z
      .number()
      .min(1000)
      .max(32_000)
      .optional()
      .default(8000)
      .describe("Maximum context tokens"),
    enableGrounding: z
      .boolean()
      .optional()
      .default(true)
      .describe("Verify grounding of the answer"),
    citationStyle: z
      .enum(["inline", "footnote", "endnote"])
      .optional()
      .default("inline")
      .describe("How to format citations"),
  }),

  async execute(params, _ctx) {
    const startTime = performance.now();

    const chunks: RAGChunk[] = params.chunks.map((c) => ({
      id: c.id,
      documentId: c.documentId,
      documentTitle: c.documentTitle,
      documentUrl: c.documentUrl,
      sourceType: c.sourceType,
      content: c.content,
      startOffset: c.startOffset ?? 0,
      endOffset: c.endOffset ?? c.content.length,
      score: c.score,
      tokenCount: c.tokenCount ?? Math.ceil(c.content.length / 4),
    }));

    if (chunks.length === 0) {
      return failure("INVALID_INPUT", "At least one chunk is required");
    }

    const engine = new RAGEngine({
      temperature: params.temperature,
      maxContextTokens: params.maxContextTokens,
      enableGrounding: params.enableGrounding,
      citationStyle: params.citationStyle,
    });

    const result = await engine.answer({
      query: params.question,
      chunks,
    });

    return success(
      {
        answer: result.answer,
        citations: result.citations.map((c) => ({
          id: c.id,
          documentId: c.documentId,
          documentTitle: c.documentTitle,
          documentUrl: c.documentUrl,
          sourceType: c.sourceType,
          snippet: c.snippet,
          relevanceScore: c.relevanceScore,
          position: c.position,
        })),
        grounding: result.grounding
          ? {
              overallScore: result.grounding.overallScore,
              confidence: result.grounding.confidence,
              unsupportedClaims: result.grounding.unsupportedClaims,
              claimCount: result.grounding.claims.length,
            }
          : null,
        confidence: result.confidence,
        followUpQuestions: result.followUpQuestions,
        usage: result.usage,
        timing: {
          analysisMs: result.timing.analysisMs,
          rerankingMs: result.timing.rerankingMs,
          generationMs: result.timing.generationMs,
          groundingMs: result.timing.groundingMs,
          totalMs: result.timing.totalMs,
          firstTokenMs: result.timing.firstTokenMs,
        },
      },
      {
        latencyMs: performance.now() - startTime,
        source: "pure-rag-engine",
        tokenCount: result.usage.totalTokens,
      }
    );
  },
});
