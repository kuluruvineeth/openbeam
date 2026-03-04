import { describe, expect, it } from "bun:test";
import { MockSLM } from "../../mocks/mock-slm";
import { EdgeNER } from "../slm-ner";

describe("EdgeNER", () => {
  it("extracts entities from SLM response", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    slm.setResponse(
      "Return ONLY valid JSON array:",
      JSON.stringify([
        {
          text: "John Smith",
          label: "PERSON",
          start: 0,
          end: 10,
          confidence: 0.95,
        },
        {
          text: "Acme Corp",
          label: "ORGANIZATION",
          start: 19,
          end: 28,
          confidence: 0.88,
        },
      ])
    );

    const ner = new EdgeNER(slm);
    const entities = await ner.extract("John Smith works at Acme Corp");
    expect(entities).toHaveLength(2);
    expect(entities[0].text).toBe("John Smith");
    expect(entities[0].label).toBe("PERSON");
    expect(entities[1].text).toBe("Acme Corp");
    expect(entities[1].label).toBe("ORGANIZATION");
  });

  it("returns empty array on non-JSON SLM response", async () => {
    const slm = new MockSLM({
      defaultResponse: "I found no entities.",
      latencyMs: 0,
    });

    const ner = new EdgeNER(slm);
    const entities = await ner.extract("no entities here");
    expect(entities).toEqual([]);
  });

  it("returns empty array for empty JSON array response", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    slm.setResponse("Return ONLY valid JSON array:", "[]");

    const ner = new EdgeNER(slm);
    const entities = await ner.extract("nothing to find");
    expect(entities).toEqual([]);
  });

  it("extracts location entities", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    slm.setResponse(
      "Return ONLY valid JSON array:",
      JSON.stringify([
        {
          text: "New York",
          label: "LOCATION",
          start: 12,
          end: 20,
          confidence: 0.92,
        },
      ])
    );

    const ner = new EdgeNER(slm);
    const entities = await ner.extract("She lives in New York");
    expect(entities).toHaveLength(1);
    expect(entities[0].label).toBe("LOCATION");
  });

  it("extracts date entities", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    slm.setResponse(
      "Return ONLY valid JSON array:",
      JSON.stringify([
        {
          text: "January 2024",
          label: "DATE",
          start: 16,
          end: 28,
          confidence: 0.87,
        },
      ])
    );

    const ner = new EdgeNER(slm);
    const entities = await ner.extract("The meeting is in January 2024");
    expect(entities).toHaveLength(1);
    expect(entities[0].label).toBe("DATE");
    expect(entities[0].text).toBe("January 2024");
  });

  it("handles multiple entity types", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    slm.setResponse(
      "Return ONLY valid JSON array:",
      JSON.stringify([
        { text: "Alice", label: "PERSON", start: 0, end: 5, confidence: 0.9 },
        {
          text: "Google",
          label: "ORGANIZATION",
          start: 15,
          end: 21,
          confidence: 0.85,
        },
        {
          text: "Chrome",
          label: "PRODUCT",
          start: 26,
          end: 32,
          confidence: 0.8,
        },
      ])
    );

    const ner = new EdgeNER(slm);
    const entities = await ner.extract(
      "Alice works at Google on Chrome browser"
    );
    expect(entities).toHaveLength(3);
    const labels = entities.map((e) => e.label);
    expect(labels).toContain("PERSON");
    expect(labels).toContain("ORGANIZATION");
    expect(labels).toContain("PRODUCT");
  });

  it("skips invalid entities in response", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    slm.setResponse(
      "Return ONLY valid JSON array:",
      JSON.stringify([
        { text: "Valid", label: "PERSON", start: 0, end: 5, confidence: 0.9 },
        { text: "Invalid" },
      ])
    );

    const ner = new EdgeNER(slm);
    const entities = await ner.extract("Valid and Invalid");
    expect(entities).toHaveLength(1);
    expect(entities[0].text).toBe("Valid");
  });

  it("throws when SLM is unavailable", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    slm.setAvailable(false);
    const ner = new EdgeNER(slm);
    await expect(ner.extract("test")).rejects.toThrow();
  });
});
