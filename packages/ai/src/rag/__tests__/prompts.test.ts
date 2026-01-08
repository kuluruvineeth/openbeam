import { describe, expect, it } from "bun:test";
import {
  buildEntityExtractionPrompt,
  buildGroundingVerificationPrompt,
  buildQueryAnalysisPrompt,
  buildRAGPromptWithExamples,
  buildRAGSystemPrompt,
  buildXMLPrompt,
  buildXMLSection,
  ENTITY_EXTRACTION_EXAMPLES,
  QUERY_ANALYSIS_EXAMPLES,
  RAG_MULTISHOT_EXAMPLES,
  type XMLSection,
} from "../prompts";
import type { QueryAnalysis, QueryIntent } from "../types";

const CONFIDENCE_PATTERN = /confidence>(high|medium|low)</;

const createMockQueryAnalysis = (
  overrides?: Partial<QueryAnalysis>
): QueryAnalysis => ({
  originalQuery: "test query",
  normalizedQuery: "test query",
  intent: "question" as QueryIntent,
  subQueries: [],
  entities: [],
  temporalContext: null,
  requiresContext: false,
  confidence: 0.9,
  keywords: [],
  ...overrides,
});

describe("XML Prompt Building", () => {
  describe("buildXMLSection", () => {
    it("creates simple XML section", () => {
      const section: XMLSection = {
        tag: "instructions",
        content: "Do something",
      };

      const result = buildXMLSection(section);

      expect(result).toBe("<instructions>\nDo something\n</instructions>");
    });

    it("includes attributes in tag", () => {
      const section: XMLSection = {
        tag: "example",
        content: "Example content",
        attributes: { id: "1", type: "positive" },
      };

      const result = buildXMLSection(section);

      expect(result).toContain('<example id="1" type="positive">');
      expect(result).toContain("</example>");
    });

    it("handles empty content", () => {
      const section: XMLSection = {
        tag: "empty",
        content: "",
      };

      const result = buildXMLSection(section);

      expect(result).toBe("<empty>\n\n</empty>");
    });

    it("handles multiline content", () => {
      const section: XMLSection = {
        tag: "rules",
        content: "Rule 1\nRule 2\nRule 3",
      };

      const result = buildXMLSection(section);

      expect(result).toContain("Rule 1\nRule 2\nRule 3");
    });
  });

  describe("buildXMLPrompt", () => {
    it("combines multiple sections", () => {
      const sections: XMLSection[] = [
        { tag: "first", content: "First content" },
        { tag: "second", content: "Second content" },
      ];

      const result = buildXMLPrompt(sections);

      expect(result).toContain("<first>");
      expect(result).toContain("<second>");
      expect(result.indexOf("<first>")).toBeLessThan(
        result.indexOf("<second>")
      );
    });

    it("separates sections with double newlines", () => {
      const sections: XMLSection[] = [
        { tag: "a", content: "A" },
        { tag: "b", content: "B" },
      ];

      const result = buildXMLPrompt(sections);

      expect(result).toContain("</a>\n\n<b>");
    });

    it("handles empty sections array", () => {
      const result = buildXMLPrompt([]);

      expect(result).toBe("");
    });
  });
});

describe("RAG System Prompt", () => {
  it("includes instructions section", () => {
    const prompt = buildRAGSystemPrompt({
      query: createMockQueryAnalysis(),
    });

    expect(prompt).toContain("<instructions>");
    expect(prompt).toContain("</instructions>");
    expect(prompt).toContain("enterprise search assistant");
  });

  it("includes output_format section", () => {
    const prompt = buildRAGSystemPrompt({
      query: createMockQueryAnalysis(),
    });

    expect(prompt).toContain("<output_format>");
    expect(prompt).toContain("</output_format>");
  });

  it("includes conversation context when provided", () => {
    const prompt = buildRAGSystemPrompt({
      query: createMockQueryAnalysis(),
      conversationSummary: "User asked about auth previously",
    });

    expect(prompt).toContain("<conversation_context>");
    expect(prompt).toContain("User asked about auth previously");
  });

  it("includes temporal focus when provided", () => {
    const prompt = buildRAGSystemPrompt({
      query: createMockQueryAnalysis({
        temporalContext: {
          type: "relative",
          description: "last week",
        },
      }),
    });

    expect(prompt).toContain("<temporal_focus>");
    expect(prompt).toContain("relative");
  });

  it("includes entities when provided", () => {
    const prompt = buildRAGSystemPrompt({
      query: createMockQueryAnalysis({
        entities: [{ type: "person", text: "John", confidence: 0.9 }],
      }),
    });

    expect(prompt).toContain("<key_entities>");
    expect(prompt).toContain("John");
    expect(prompt).toContain("person");
  });
});

describe("Query Analysis Prompt", () => {
  it("includes analysis instructions", () => {
    const prompt = buildQueryAnalysisPrompt();

    expect(prompt).toContain("<instructions>");
    expect(prompt).toContain("Analyze the user query");
    expect(prompt).toContain("analysis_tasks");
  });

  it("includes output format specification", () => {
    const prompt = buildQueryAnalysisPrompt();

    expect(prompt).toContain("<output_format>");
    expect(prompt).toContain("<analysis>");
    expect(prompt).toContain("<intent>");
    expect(prompt).toContain("<entities>");
  });

  it("specifies all intent types", () => {
    const prompt = buildQueryAnalysisPrompt();

    expect(prompt).toContain("question");
    expect(prompt).toContain("command");
    expect(prompt).toContain("search");
    expect(prompt).toContain("comparison");
    expect(prompt).toContain("definition");
  });
});

describe("Grounding Verification Prompt", () => {
  it("includes verification instructions", () => {
    const prompt = buildGroundingVerificationPrompt();

    expect(prompt).toContain("<instructions>");
    expect(prompt).toContain("verification_tasks");
    expect(prompt).toContain("grounding_criteria");
  });

  it("includes confidence level criteria", () => {
    const prompt = buildGroundingVerificationPrompt();

    expect(prompt).toContain("High confidence (0.8-1.0)");
    expect(prompt).toContain("Medium confidence (0.5-0.8)");
    expect(prompt).toContain("Low confidence (0.3-0.5)");
    expect(prompt).toContain("Unsupported (0-0.3)");
  });

  it("includes output format specification", () => {
    const prompt = buildGroundingVerificationPrompt();

    expect(prompt).toContain("<verification>");
    expect(prompt).toContain("<overall_score>");
    expect(prompt).toContain("<claims>");
    expect(prompt).toContain("<unsupported_claims>");
  });
});

describe("Entity Extraction Prompt", () => {
  it("includes entity type definitions", () => {
    const prompt = buildEntityExtractionPrompt();

    expect(prompt).toContain("<entity_types>");
    expect(prompt).toContain("person:");
    expect(prompt).toContain("organization:");
    expect(prompt).toContain("technology:");
    expect(prompt).toContain("product:");
  });

  it("includes extraction rules", () => {
    const prompt = buildEntityExtractionPrompt();

    expect(prompt).toContain("<extraction_rules>");
    expect(prompt).toContain("confidence");
  });

  it("includes output format specification", () => {
    const prompt = buildEntityExtractionPrompt();

    expect(prompt).toContain("<entities>");
    expect(prompt).toContain("<text>");
    expect(prompt).toContain("<confidence>");
  });
});

describe("Multishot Examples", () => {
  describe("RAG_MULTISHOT_EXAMPLES", () => {
    it("has at least 3 examples", () => {
      expect(RAG_MULTISHOT_EXAMPLES.length).toBeGreaterThanOrEqual(3);
    });

    it("examples have required fields", () => {
      for (const example of RAG_MULTISHOT_EXAMPLES) {
        expect(example.context).toBeDefined();
        expect(example.question).toBeDefined();
        expect(example.answer).toBeDefined();
      }
    });

    it("examples include confidence levels", () => {
      for (const example of RAG_MULTISHOT_EXAMPLES) {
        expect(example.answer).toMatch(CONFIDENCE_PATTERN);
      }
    });
  });

  describe("QUERY_ANALYSIS_EXAMPLES", () => {
    it("has examples covering different query types", () => {
      const analyses = QUERY_ANALYSIS_EXAMPLES.map((ex) => ex.analysis);

      expect(analyses.some((a) => a.includes("<intent>command"))).toBe(true);
      expect(analyses.some((a) => a.includes("<intent>comparison"))).toBe(true);
    });

    it("examples include entity extraction", () => {
      for (const example of QUERY_ANALYSIS_EXAMPLES) {
        expect(example.analysis).toContain("<entities>");
      }
    });
  });

  describe("ENTITY_EXTRACTION_EXAMPLES", () => {
    it("has at least 3 diverse examples", () => {
      expect(ENTITY_EXTRACTION_EXAMPLES.length).toBeGreaterThanOrEqual(3);
    });

    it("examples cover different entity types", () => {
      const allTypes = ENTITY_EXTRACTION_EXAMPLES.flatMap((ex) =>
        [...ex.extraction.matchAll(/type="(\w+)"/g)].map((m) => m[1])
      );

      expect(allTypes).toContain("person");
      expect(allTypes).toContain("organization");
      expect(allTypes).toContain("technology");
    });
  });
});

describe("buildRAGPromptWithExamples", () => {
  it("includes base prompt and examples", () => {
    const prompt = buildRAGPromptWithExamples({
      query: createMockQueryAnalysis(),
    });

    expect(prompt).toContain("<instructions>");
    expect(prompt).toContain("<examples>");
    expect(prompt).toContain('<example id="1">');
  });

  it("includes numbered examples", () => {
    const prompt = buildRAGPromptWithExamples({
      query: createMockQueryAnalysis(),
    });

    expect(prompt).toContain('<example id="1">');
    expect(prompt).toContain('<example id="2">');
    expect(prompt).toContain('<example id="3">');
  });

  it("each example has context, question, and response", () => {
    const prompt = buildRAGPromptWithExamples({
      query: createMockQueryAnalysis(),
    });

    expect(prompt).toContain("<context>");
    expect(prompt).toContain("<question>");
    expect(prompt).toContain("<response>");
  });
});
