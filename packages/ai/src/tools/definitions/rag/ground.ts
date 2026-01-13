import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

const EvidenceSchema = z.object({
  documentId: z.string().min(1),
  content: z.string().min(1),
  title: z.string().optional(),
  url: z.string().optional(),
});

export const ragGroundTool = defineTool({
  name: "rag_ground",
  description: `Ground a claim or statement against provided evidence documents.

USE THIS WHEN:
- Verifying a single claim or statement against sources
- Building granular fact-checking workflows
- Checking if specific information exists in documents before citing
- Validating user-provided claims against knowledge base

DO NOT USE WHEN:
- Verifying a full RAG response (use rag_verify for multi-claim verification)
- You don't have the evidence documents (retrieve them first)
- The claim is conversational with no factual content

RETURNS: Grounding assessment with support level, confidence score, and evidence snippets that support or contradict the claim.`,
  category: "rag",
  deferLoading: false,
  searchKeywords: ["ground", "verify", "fact", "check", "evidence", "claim"],

  parameters: z.object({
    claim: z
      .string()
      .min(1)
      .describe(
        "The claim or statement to verify against the evidence. Should be a single, specific factual assertion."
      ),
    evidence: z
      .array(EvidenceSchema)
      .min(1)
      .max(20)
      .describe(
        "Documents or chunks to check the claim against. Each should include documentId and content."
      ),
    strictMode: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "When true, requires explicit support. When false, absence of contradiction is considered weak support."
      ),
  }),

  execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const documents = params.evidence.map((e) => ({
      id: e.documentId,
      title: e.title ?? "Untitled",
      content: e.content,
      url: e.url,
      teamId: ctx.teamId,
    }));

    const result = ctx.services.rag.verifyGrounding(params.claim, documents);

    const primaryClaim = result.claims[0];
    if (!primaryClaim) {
      return failure(
        "INTERNAL_ERROR",
        "Grounding verification produced no results"
      );
    }

    const supportingEvidence = result.claims
      .filter((c) => c.supported && c.evidenceSnippet)
      .map((c) => ({
        snippet: c.evidenceSnippet as string,
        confidence: c.confidence,
      }));

    const contradictingEvidence = result.claims
      .filter((c) => !c.supported && c.evidenceSnippet)
      .map((c) => ({
        snippet: c.evidenceSnippet as string,
        confidence: c.confidence,
      }));

    type SupportLevel = "strong" | "weak" | "unsupported" | "contradicted";
    let supportLevel: SupportLevel;
    if (result.overallScore >= 0.8) {
      supportLevel = "strong";
    } else if (result.overallScore >= 0.5) {
      supportLevel = "weak";
    } else if (contradictingEvidence.length > 0) {
      supportLevel = "contradicted";
    } else {
      supportLevel = "unsupported";
    }

    if (params.strictMode && supportLevel === "weak") {
      supportLevel = "unsupported";
    }

    return success(
      {
        claim: params.claim,
        isGrounded: result.overallScore >= (params.strictMode ? 0.8 : 0.5),
        supportLevel,
        confidence: result.overallScore,
        supportingEvidence,
        contradictingEvidence,
        documentsChecked: params.evidence.length,
      },
      {
        latencyMs: performance.now() - startTime,
        source: "grounding-engine",
      }
    );
  },
});
