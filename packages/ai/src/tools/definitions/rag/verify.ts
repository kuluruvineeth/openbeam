import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const ragVerifyTool = defineTool({
  name: "rag_verify",
  description: `Verify that claims in a generated response are grounded in source documents.

USE THIS WHEN:
- Validating a RAG answer before presenting to users
- Checking if an answer contains unsupported or hallucinated claims
- Building a quality assurance layer for AI-generated content
- User asks for verification of previous answers
- Response includes factual claims that must be traceable to sources

DO NOT USE WHEN:
- Generating the initial answer (use rag_answer which includes verification)
- You don't have source document IDs (retrieve documents first)
- Response is purely conversational with no factual claims
- Documents are not from the knowledge base (external verification not supported)

RETURNS: Grounding analysis including overall score (0-1), per-claim verification with supporting evidence snippets, list of unsupported claims, and confidence levels. Score >= 0.7 indicates well-grounded response.`,
  category: "rag",
  deferLoading: false,
  searchKeywords: ["verify", "grounding", "validate", "check", "factual"],

  parameters: z.object({
    response: z
      .string()
      .min(1)
      .describe(
        "The response text to verify. Include the complete answer containing claims to check against source documents."
      ),
    sourceDocumentIds: z
      .array(z.string())
      .min(1)
      .describe(
        "IDs of source documents to verify against. These should be the documents that were used to generate the response. Obtain from rag_answer citations or search results."
      ),
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
