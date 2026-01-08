import { describe, expect, it } from "bun:test";
import {
  checkForRefusal,
  createGroundedAnswer,
  extractClaims,
  findSupportingEvidence,
  REFUSAL_TEMPLATES,
  verifyGrounding,
} from "../grounding";
import type { RAGChunk } from "../types";

const createMockChunk = (
  id: string,
  content: string,
  score = 0.8
): RAGChunk => ({
  id,
  documentId: `doc-${id}`,
  documentTitle: `Document ${id}`,
  documentUrl: `https://example.com/doc/${id}`,
  sourceType: "confluence",
  content,
  startOffset: 0,
  endOffset: content.length,
  score,
  tokenCount: content.split(" ").length,
});

describe("extractClaims", () => {
  it("extracts factual claims from text", () => {
    const answer =
      "The API provides rate limiting. Users can configure limits.";
    const claims = extractClaims(answer);

    expect(claims.length).toBeGreaterThan(0);
    expect(claims[0]).toContain("API");
  });

  it("filters out opinion statements", () => {
    const answer = "I think the API is good. Maybe it will improve.";
    const claims = extractClaims(answer);

    expect(claims.length).toBe(0);
  });

  it("filters out questions", () => {
    const answer = "What is the API rate limit?";
    const claims = extractClaims(answer);

    expect(claims.length).toBe(0);
  });

  it("handles empty input", () => {
    const claims = extractClaims("");
    expect(claims).toEqual([]);
  });
});

describe("verifyGrounding", () => {
  it("returns high confidence when claims match chunks", () => {
    const answer = "The project uses TypeScript for type safety.";
    const chunks = [
      createMockChunk(
        "1",
        "The project is built using TypeScript for improved type safety and developer experience."
      ),
    ];

    const result = verifyGrounding(answer, chunks);

    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.confidence).not.toBe("uncertain");
  });

  it("returns low confidence when claims have no support", () => {
    const answer = "The system uses Python for all backend services.";
    const chunks = [
      createMockChunk("1", "The frontend is built with React and Next.js."),
    ];

    const result = verifyGrounding(answer, chunks);

    expect(result.overallScore).toBeLessThan(0.5);
  });

  it("handles empty answer", () => {
    const result = verifyGrounding("", []);

    expect(result.overallScore).toBe(1.0);
    expect(result.confidence).toBe("high");
    expect(result.claims).toEqual([]);
  });

  it("handles empty chunks", () => {
    const answer = "The API provides authentication.";
    const result = verifyGrounding(answer, []);

    expect(result.unsupportedClaims.length).toBeGreaterThan(0);
  });
});

describe("findSupportingEvidence", () => {
  it("finds evidence for matching claim", () => {
    const claim = "TypeScript provides type safety";
    const chunks = [
      createMockChunk(
        "1",
        "TypeScript provides compile-time type safety for JavaScript applications."
      ),
    ];

    const evidence = findSupportingEvidence(claim, chunks);

    expect(evidence).not.toBeNull();
    expect(evidence?.chunkId).toBe("1");
    expect(evidence?.relevanceScore).toBeGreaterThan(0);
  });

  it("returns null when no evidence found", () => {
    const claim = "Python is the best language";
    const chunks = [
      createMockChunk("1", "JavaScript and TypeScript are popular choices."),
    ];

    const evidence = findSupportingEvidence(claim, chunks);

    expect(evidence).toBeNull();
  });

  it("handles empty chunks", () => {
    const evidence = findSupportingEvidence("Some claim", []);
    expect(evidence).toBeNull();
  });
});

describe("createGroundedAnswer", () => {
  it("creates grounded answer with citations", () => {
    const answer = "TypeScript provides type safety for applications.";
    const chunks = [
      createMockChunk(
        "1",
        "TypeScript provides compile-time type safety for JavaScript applications."
      ),
    ];
    const groundingResult = verifyGrounding(answer, chunks);

    const grounded = createGroundedAnswer(answer, chunks, groundingResult);

    expect(grounded.answer).toBe(answer);
    expect(grounded.groundingScore).toBeGreaterThanOrEqual(0);
    expect(grounded.confidence).toBeGreaterThan(0);
  });

  it("includes suggested follow-up when grounding has unsupported claims", () => {
    const answer = "The moon is made of cheese.";
    const chunks = [createMockChunk("1", "The Earth orbits around the Sun.")];
    const groundingResult = verifyGrounding(answer, chunks);

    const grounded = createGroundedAnswer(answer, chunks, groundingResult);

    if (grounded.ungroundedClaims.length > 0) {
      expect(grounded.suggestedFollowUp).toBeDefined();
    }
  });
});

describe("checkForRefusal", () => {
  it("does not refuse when grounding is high", () => {
    const chunks = [
      createMockChunk("1", "The API is available and working correctly."),
    ];
    const groundingResult = {
      claims: [
        {
          claim: "The API is available",
          supported: true,
          evidenceChunkId: "1",
          evidenceSnippet: "The API is available",
          confidence: 0.9,
        },
      ],
      overallScore: 0.85,
      confidence: "high" as const,
      unsupportedClaims: [],
    };

    const result = checkForRefusal(groundingResult, chunks);

    expect(result).toBeNull();
  });

  it("refuses with noSources when no chunks", () => {
    const groundingResult = {
      claims: [],
      overallScore: 0,
      confidence: "uncertain" as const,
      unsupportedClaims: [],
    };

    const result = checkForRefusal(groundingResult, []);

    expect(result).not.toBeNull();
    expect(result?.type).toBe("noSources");
  });

  it("refuses with mixedGrounding when some claims are ungrounded", () => {
    const chunks = [createMockChunk("1", "The API exists and is functional.")];
    const groundingResult = {
      claims: [
        {
          claim: "The API exists",
          supported: true,
          evidenceChunkId: "1",
          evidenceSnippet: "The API exists",
          confidence: 0.8,
        },
        {
          claim: "It was built by aliens",
          supported: false,
          evidenceChunkId: null,
          evidenceSnippet: null,
          confidence: 0.1,
        },
      ],
      overallScore: 0.4,
      confidence: "low" as const,
      unsupportedClaims: ["It was built by aliens."],
    };

    const result = checkForRefusal(groundingResult, chunks);

    expect(result).not.toBeNull();
    expect(result?.type).toBe("mixedGrounding");
  });

  it("refuses with lowConfidence when score is very low", () => {
    const chunks = [createMockChunk("1", "Some related content")];
    const groundingResult = {
      claims: [
        {
          claim: "The system works somehow",
          supported: false,
          evidenceChunkId: null,
          evidenceSnippet: null,
          confidence: 0.2,
        },
      ],
      overallScore: 0.2,
      confidence: "uncertain" as const,
      unsupportedClaims: ["The system works somehow"],
    };

    const result = checkForRefusal(groundingResult, chunks);

    expect(result).not.toBeNull();
    expect(result?.type).toBe("lowConfidence");
  });
});

describe("REFUSAL_TEMPLATES", () => {
  it("has all required templates", () => {
    expect(REFUSAL_TEMPLATES.noSources).toBeDefined();
    expect(REFUSAL_TEMPLATES.lowConfidence).toBeDefined();
    expect(REFUSAL_TEMPLATES.mixedGrounding).toBeDefined();
    expect(REFUSAL_TEMPLATES.outOfScope).toBeDefined();
  });

  it("templates have message and suggestedAction", () => {
    expect(REFUSAL_TEMPLATES.noSources.message).toBeDefined();
    expect(REFUSAL_TEMPLATES.noSources.suggestedAction).toBeDefined();
    expect(REFUSAL_TEMPLATES.lowConfidence.message).toBeDefined();
    expect(REFUSAL_TEMPLATES.mixedGrounding.message).toBeDefined();
  });
});
