import { describe, expect, it } from "bun:test";
import { MockSLM } from "../../mocks/mock-slm";
import { QueryClassifier } from "../classifier";

describe("QueryClassifier", () => {
  it("classifies query using SLM response", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    slm.setResponse(
      "Classify the following",
      JSON.stringify({
        intent: "question",
        confidence: 0.92,
        entities: [
          {
            text: "documents",
            label: "DOCUMENT",
            start: 12,
            end: 21,
            confidence: 0.8,
          },
        ],
      })
    );

    const classifier = new QueryClassifier(slm);
    const result = await classifier.classify("show me documents");
    expect(result.intent).toBe("question");
    expect(result.confidence).toBe(0.92);
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].text).toBe("documents");
  });

  it("returns fallback on invalid SLM response", async () => {
    const slm = new MockSLM({
      defaultResponse: "I cannot classify this",
      latencyMs: 0,
    });
    const classifier = new QueryClassifier(slm);

    const result = await classifier.classify("random input");
    expect(result.intent).toBe("search");
    expect(result.confidence).toBe(0.5);
    expect(result.entities).toEqual([]);
  });

  it("handles navigation intent", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    slm.setResponse(
      "Classify the following",
      JSON.stringify({
        intent: "navigation",
        confidence: 0.88,
        entities: [],
      })
    );

    const classifier = new QueryClassifier(slm);
    const result = await classifier.classify("go to settings");
    expect(result.intent).toBe("navigation");
  });

  it("handles command intent", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    slm.setResponse(
      "Classify the following",
      JSON.stringify({
        intent: "command",
        confidence: 0.95,
        entities: [],
      })
    );

    const classifier = new QueryClassifier(slm);
    const result = await classifier.classify("delete all drafts");
    expect(result.intent).toBe("command");
    expect(result.confidence).toBe(0.95);
  });

  it("handles conversation intent", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    slm.setResponse(
      "Classify the following",
      JSON.stringify({
        intent: "conversation",
        confidence: 0.7,
        entities: [],
      })
    );

    const classifier = new QueryClassifier(slm);
    const result = await classifier.classify("hello how are you");
    expect(result.intent).toBe("conversation");
  });

  it("includes suggestedRewrite when provided", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    slm.setResponse(
      "Classify the following",
      JSON.stringify({
        intent: "search",
        confidence: 0.8,
        entities: [],
        suggestedRewrite: "better query terms",
      })
    );

    const classifier = new QueryClassifier(slm);
    const result = await classifier.classify("vague query");
    expect(result.suggestedRewrite).toBe("better query terms");
  });

  it("throws on unavailable SLM", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    slm.setAvailable(false);
    const classifier = new QueryClassifier(slm);
    await expect(classifier.classify("test")).rejects.toThrow();
  });
});
