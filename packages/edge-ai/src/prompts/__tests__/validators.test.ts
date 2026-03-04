import { describe, expect, it } from "bun:test";
import { parseNERResponse, parseQueryClassification } from "../validators";

describe("parseNERResponse", () => {
  it("parses valid JSON array", () => {
    const raw = JSON.stringify([
      { text: "John", label: "PERSON", start: 0, end: 4, confidence: 0.95 },
      {
        text: "Acme Corp",
        label: "ORGANIZATION",
        start: 14,
        end: 23,
        confidence: 0.88,
      },
    ]);
    const result = parseNERResponse(raw);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("John");
    expect(result[0].label).toBe("PERSON");
    expect(result[1].text).toBe("Acme Corp");
  });

  it("handles JSON with leading text", () => {
    const raw = `Here are the entities: [{"text":"NYC","label":"LOCATION","start":0,"end":3,"confidence":0.9}]`;
    const result = parseNERResponse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("NYC");
  });

  it("handles JSON with trailing text", () => {
    const raw = `[{"text":"NYC","label":"LOCATION","start":0,"end":3,"confidence":0.9}] That's all.`;
    const result = parseNERResponse(raw);
    expect(result).toHaveLength(1);
  });

  it("returns empty array for empty JSON array", () => {
    expect(parseNERResponse("[]")).toEqual([]);
  });

  it("returns empty array for non-JSON input", () => {
    expect(parseNERResponse("no json here")).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseNERResponse("")).toEqual([]);
  });

  it("skips invalid entities in the array", () => {
    const raw = JSON.stringify([
      { text: "John", label: "PERSON", start: 0, end: 4, confidence: 0.9 },
      { text: "Missing fields" },
      { text: "Jane", label: "PERSON", start: 10, end: 14, confidence: 0.85 },
    ]);
    const result = parseNERResponse(raw);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("John");
    expect(result[1].text).toBe("Jane");
  });

  it("clamps confidence values above 1", () => {
    const raw = JSON.stringify([
      { text: "Test", label: "PERSON", start: 0, end: 4, confidence: 1.5 },
    ]);
    const result = parseNERResponse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(1);
  });

  it("clamps negative confidence values", () => {
    const raw = JSON.stringify([
      { text: "Test", label: "PERSON", start: 0, end: 4, confidence: -0.3 },
    ]);
    const result = parseNERResponse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0);
  });

  it("returns empty array for non-array JSON", () => {
    expect(parseNERResponse('{"not": "array"}')).toEqual([]);
  });

  it("skips non-object items in array", () => {
    const raw = JSON.stringify([
      "string",
      42,
      null,
      { text: "Valid", label: "PERSON", start: 0, end: 5, confidence: 0.8 },
    ]);
    const result = parseNERResponse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Valid");
  });
});

describe("parseQueryClassification", () => {
  it("parses valid classification", () => {
    const raw = JSON.stringify({
      intent: "search",
      confidence: 0.92,
      entities: [
        {
          text: "documents",
          label: "DOCUMENT",
          start: 8,
          end: 17,
          confidence: 0.8,
        },
      ],
    });
    const result = parseQueryClassification(raw);
    expect(result).not.toBeNull();
    expect(result?.intent).toBe("search");
    expect(result?.confidence).toBe(0.92);
    expect(result?.entities).toHaveLength(1);
  });

  it("parses classification without entities", () => {
    const raw = JSON.stringify({
      intent: "question",
      confidence: 0.85,
    });
    const result = parseQueryClassification(raw);
    expect(result).not.toBeNull();
    expect(result?.intent).toBe("question");
    expect(result?.entities).toEqual([]);
  });

  it("parses classification with suggestedRewrite", () => {
    const raw = JSON.stringify({
      intent: "search",
      confidence: 0.75,
      entities: [],
      suggestedRewrite: "improved query text",
    });
    const result = parseQueryClassification(raw);
    expect(result?.suggestedRewrite).toBe("improved query text");
  });

  it("handles JSON with surrounding text", () => {
    const raw = `The classification is: {"intent":"navigation","confidence":0.9,"entities":[]} and that's it.`;
    const result = parseQueryClassification(raw);
    expect(result?.intent).toBe("navigation");
  });

  it("returns null for non-JSON input", () => {
    expect(parseQueryClassification("not json")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseQueryClassification("")).toBeNull();
  });

  it("returns null for invalid intent", () => {
    const raw = JSON.stringify({
      intent: "invalid_intent",
      confidence: 0.9,
      entities: [],
    });
    expect(parseQueryClassification(raw)).toBeNull();
  });

  it("clamps confidence above 1", () => {
    const raw = JSON.stringify({
      intent: "command",
      confidence: 2.5,
      entities: [],
    });
    const result = parseQueryClassification(raw);
    expect(result?.confidence).toBe(1);
  });

  it("clamps negative confidence", () => {
    const raw = JSON.stringify({
      intent: "conversation",
      confidence: -0.5,
      entities: [],
    });
    const result = parseQueryClassification(raw);
    expect(result?.confidence).toBe(0);
  });

  it("clamps entity confidence values", () => {
    const raw = JSON.stringify({
      intent: "search",
      confidence: 0.8,
      entities: [
        { text: "test", label: "PERSON", start: 0, end: 4, confidence: 5.0 },
      ],
    });
    const result = parseQueryClassification(raw);
    expect(result?.entities[0].confidence).toBe(1);
  });

  it("returns null for array JSON", () => {
    expect(parseQueryClassification("[1,2,3]")).toBeNull();
  });
});
