import { describe, expect, it } from "bun:test";
import {
  type EdgeGenerateOptions,
  EdgeGenerateOptionsSchema,
  type EdgeRAGResponse,
  EdgeRAGResponseSchema,
  EdgeSLMResponseSchema,
  NEREntitySchema,
  type QueryClassification,
  QueryClassificationSchema,
} from "../ai";

describe("EdgeGenerateOptionsSchema", () => {
  it("uses defaults", () => {
    const opts: EdgeGenerateOptions = EdgeGenerateOptionsSchema.parse({});
    expect(opts.maxTokens).toBe(512);
    expect(opts.temperature).toBe(0.3);
    expect(opts.stopSequences).toBeUndefined();
  });

  it("accepts overrides", () => {
    const opts = EdgeGenerateOptionsSchema.parse({
      maxTokens: 1024,
      temperature: 0.7,
      stopSequences: ["###", "END"],
      systemPrompt: "You are a helpful assistant.",
    });
    expect(opts.maxTokens).toBe(1024);
    expect(opts.stopSequences).toHaveLength(2);
  });

  it("rejects invalid temperature", () => {
    expect(() => EdgeGenerateOptionsSchema.parse({ temperature: 3 })).toThrow();
  });
});

describe("EdgeSLMResponseSchema", () => {
  it("parses valid response", () => {
    const resp = EdgeSLMResponseSchema.parse({
      text: "The answer is 42.",
      tokensUsed: 15,
      latencyMs: 234,
    });
    expect(resp.text).toBe("The answer is 42.");
    expect(resp.truncated).toBe(false);
  });

  it("accepts truncated flag", () => {
    const resp = EdgeSLMResponseSchema.parse({
      text: "Partial answer...",
      tokensUsed: 512,
      latencyMs: 1000,
      truncated: true,
    });
    expect(resp.truncated).toBe(true);
  });
});

describe("EdgeRAGResponseSchema", () => {
  it("parses valid RAG response", () => {
    const resp: EdgeRAGResponse = EdgeRAGResponseSchema.parse({
      answer: "Revenue grew 15% in Q3.",
      sources: [
        {
          documentId: "doc-1",
          title: "Q3 Report",
          snippet: "Revenue increased...",
          score: 0.95,
        },
      ],
      tokensUsed: 150,
      latencyMs: 500,
      searchLatencyMs: 50,
      generationLatencyMs: 450,
    });
    expect(resp.sources).toHaveLength(1);
    expect(resp.queryRewrite).toBeUndefined();
  });

  it("accepts query rewrite", () => {
    const resp = EdgeRAGResponseSchema.parse({
      answer: "Test",
      sources: [],
      queryRewrite: "quarterly revenue growth Q3",
      tokensUsed: 20,
      latencyMs: 100,
      searchLatencyMs: 30,
      generationLatencyMs: 70,
    });
    expect(resp.queryRewrite).toBe("quarterly revenue growth Q3");
  });
});

describe("NEREntitySchema", () => {
  it("parses valid entity", () => {
    const entity = NEREntitySchema.parse({
      text: "OpenBeam",
      label: "ORGANIZATION",
      start: 0,
      end: 9,
      confidence: 0.98,
    });
    expect(entity.label).toBe("ORGANIZATION");
  });

  it("validates confidence range", () => {
    expect(() =>
      NEREntitySchema.parse({
        text: "x",
        label: "ORG",
        start: 0,
        end: 1,
        confidence: 1.5,
      })
    ).toThrow();
  });
});

describe("QueryClassificationSchema", () => {
  it("parses valid classification", () => {
    const cls: QueryClassification = QueryClassificationSchema.parse({
      intent: "search",
      confidence: 0.92,
    });
    expect(cls.intent).toBe("search");
    expect(cls.entities).toEqual([]);
  });

  it("accepts all intents", () => {
    for (const intent of [
      "search",
      "question",
      "navigation",
      "command",
      "conversation",
    ]) {
      expect(
        QueryClassificationSchema.parse({ intent, confidence: 0.5 }).intent
      ).toBe(intent);
    }
  });

  it("accepts entities and rewrite", () => {
    const cls = QueryClassificationSchema.parse({
      intent: "question",
      confidence: 0.85,
      entities: [
        {
          text: "Q3 report",
          label: "DOCUMENT",
          start: 5,
          end: 14,
          confidence: 0.9,
        },
      ],
      suggestedRewrite: "What does the Q3 report say about revenue?",
    });
    expect(cls.entities).toHaveLength(1);
    expect(cls.suggestedRewrite).toBeDefined();
  });
});
