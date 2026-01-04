import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const ragVerifyTool = defineTool({
  name: "rag_verify",
  description: `Verify that claims in a response are grounded in source documents.
Returns grounding scores and identifies unsupported claims.
Use to validate RAG answers before presenting to users.`,
  category: "rag",
  deferLoading: false,
  searchKeywords: ["verify", "grounding", "validate", "check", "factual"],

  parameters: z.object({
    response: z.string().min(1).describe("The response to verify"),
    sourceDocumentIds: z
      .array(z.string())
      .min(1)
      .describe("IDs of source documents"),
  }),

  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const documents = await Promise.all(
      params.sourceDocumentIds.map((id) => ctx.services.documents.get(id))
    );

    const validDocs = documents.filter(
      (doc): doc is NonNullable<typeof doc> =>
        doc !== null && doc.teamId === ctx.teamId
    );

    if (validDocs.length === 0) {
      return failure("NOT_FOUND", "No documents found for verification");
    }

    const result = ctx.services.rag.verifyGrounding(params.response, validDocs);

    const unsupportedClaims = result.claims
      .filter((c) => !c.supported)
      .map((c) => c.claim);

    return success(
      {
        isGrounded: result.overallScore >= 0.7,
        overallScore: result.overallScore,
        confidence: result.confidence,
        claims: result.claims.map((c) => ({
          claim: c.claim,
          supported: c.supported,
          confidence: c.confidence,
          evidenceSnippet: c.evidenceSnippet,
        })),
        unsupportedClaims,
        totalClaims: result.claims.length,
        supportedClaims: result.claims.filter((c) => c.supported).length,
      },
      {
        latencyMs: performance.now() - startTime,
        source: "grounding-verifier",
      }
    );
  },
});
