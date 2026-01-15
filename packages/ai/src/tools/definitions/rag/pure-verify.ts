import type { RAGChunk } from "@openplane/types/ai";
import { z } from "zod";
import {
  formatGroundingWarning,
  verifyGrounding,
} from "../../../rag/grounding";
import { defineTool, success } from "../../builder";

const ChunkSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  documentTitle: z.string(),
  documentUrl: z.string().optional(),
  sourceType: z.string(),
  content: z.string(),
  score: z.number(),
});

export const pureVerifyGroundingTool = defineTool({
  name: "verify_grounding",
  description: `Verify that claims in a response are supported by source chunks.
Returns grounding scores, identifies unsupported claims, and provides confidence levels.
Use to validate AI-generated answers before presenting to users.`,
  category: "analysis",
  deferLoading: false,
  searchKeywords: [
    "verify",
    "grounding",
    "validate",
    "check",
    "factual",
    "claims",
  ],

  parameters: z.object({
    response: z.string().min(1).describe("The response to verify"),
    chunks: z
      .array(ChunkSchema)
      .min(1)
      .describe("Source chunks to verify against"),
    threshold: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.3)
      .describe("Minimum term overlap for claim support"),
  }),

  execute(params, _ctx) {
    const startTime = performance.now();

    const chunks: RAGChunk[] = params.chunks.map((c) => ({
      id: c.id,
      documentId: c.documentId,
      documentTitle: c.documentTitle,
      documentUrl: c.documentUrl,
      sourceType: c.sourceType,
      content: c.content,
      startOffset: 0,
      endOffset: c.content.length,
      score: c.score,
      tokenCount: Math.ceil(c.content.length / 4),
    }));

    const result = verifyGrounding(params.response, chunks, params.threshold);
    const warning = formatGroundingWarning(result);

    return Promise.resolve(
      success(
        {
          isGrounded: result.overallScore >= 0.7,
          overallScore: result.overallScore,
          confidence: result.confidence,
          claims: result.claims.map((c) => ({
            claim: c.claim,
            supported: c.supported,
            confidence: c.confidence,
            evidenceChunkId: c.evidenceChunkId,
            evidenceSnippet: c.evidenceSnippet,
          })),
          unsupportedClaims: result.unsupportedClaims,
          totalClaims: result.claims.length,
          supportedClaims: result.claims.filter((c) => c.supported).length,
          warning,
        },
        {
          latencyMs: performance.now() - startTime,
          source: "pure-grounding-verifier",
        }
      )
    );
  },
});
