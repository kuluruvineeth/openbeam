import { describe, expect, it } from "bun:test";
import {
  EDGE_NER_PROMPT,
  EDGE_QUERY_CLASSIFY_PROMPT,
  EDGE_QUERY_REWRITE_PROMPT,
  EDGE_RAG_PROMPT,
  EDGE_SUMMARIZE_PROMPT,
  formatPrompt,
} from "../templates";

describe("formatPrompt", () => {
  it("replaces single variable", () => {
    const result = formatPrompt("Hello {name}!", { name: "World" });
    expect(result).toBe("Hello World!");
  });

  it("replaces multiple variables", () => {
    const result = formatPrompt("{greeting} {name}!", {
      greeting: "Hi",
      name: "Alice",
    });
    expect(result).toBe("Hi Alice!");
  });

  it("replaces all occurrences of the same variable", () => {
    const result = formatPrompt("{x} and {x}", { x: "A" });
    expect(result).toBe("A and A");
  });

  it("leaves unmatched placeholders intact", () => {
    const result = formatPrompt("{a} {b}", { a: "hello" });
    expect(result).toBe("hello {b}");
  });

  it("handles empty variables object", () => {
    const result = formatPrompt("no vars here", {});
    expect(result).toBe("no vars here");
  });

  it("handles empty string values", () => {
    const result = formatPrompt("before {x} after", { x: "" });
    expect(result).toBe("before  after");
  });

  it("handles special regex characters in values", () => {
    const result = formatPrompt("{query}", { query: "test $1 value" });
    expect(result).toBe("test $1 value");
  });
});

describe("prompt templates", () => {
  it("EDGE_RAG_PROMPT contains context and query placeholders", () => {
    expect(EDGE_RAG_PROMPT).toContain("{context}");
    expect(EDGE_RAG_PROMPT).toContain("{query}");
  });

  it("EDGE_NER_PROMPT contains text placeholder", () => {
    expect(EDGE_NER_PROMPT).toContain("{text}");
  });

  it("EDGE_QUERY_REWRITE_PROMPT contains query placeholder", () => {
    expect(EDGE_QUERY_REWRITE_PROMPT).toContain("{query}");
  });

  it("EDGE_QUERY_CLASSIFY_PROMPT contains query placeholder", () => {
    expect(EDGE_QUERY_CLASSIFY_PROMPT).toContain("{query}");
  });

  it("EDGE_SUMMARIZE_PROMPT contains text placeholder", () => {
    expect(EDGE_SUMMARIZE_PROMPT).toContain("{text}");
  });

  it("RAG prompt can be formatted with context and query", () => {
    const result = formatPrompt(EDGE_RAG_PROMPT, {
      context: "[1] Doc Title\nSome content",
      query: "What is OpenBeam?",
    });
    expect(result).toContain("[1] Doc Title");
    expect(result).toContain("What is OpenBeam?");
    expect(result).not.toContain("{context}");
    expect(result).not.toContain("{query}");
  });

  it("NER prompt can be formatted with text", () => {
    const result = formatPrompt(EDGE_NER_PROMPT, {
      text: "John works at Acme Corp in New York",
    });
    expect(result).toContain("John works at Acme Corp");
    expect(result).not.toContain("{text}");
  });

  it("classify prompt can be formatted with query", () => {
    const result = formatPrompt(EDGE_QUERY_CLASSIFY_PROMPT, {
      query: "show me recent documents",
    });
    expect(result).toContain("show me recent documents");
    expect(result).not.toContain("{query}");
  });
});
