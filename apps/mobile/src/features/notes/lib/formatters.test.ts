import { describe, expect, it } from "vitest";
import { extractPreview, formatWordCount, wordCount } from "./formatters";

describe("extractPreview", () => {
  it("returns short content unchanged", () => {
    expect(extractPreview("Hello world")).toBe("Hello world");
  });

  it("strips markdown syntax", () => {
    expect(extractPreview("## Hello **bold** _italic_")).toBe(
      "Hello bold italic"
    );
  });

  it("truncates long content with ellipsis", () => {
    const long = "a".repeat(100);
    const result = extractPreview(long);
    expect(result).toHaveLength(83);
    // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
    expect(result).toMatch(/\.\.\.$/);
  });

  it("trims whitespace", () => {
    expect(extractPreview("  spaced  ")).toBe("spaced");
  });

  it("returns empty string for empty content", () => {
    expect(extractPreview("")).toBe("");
  });
});

describe("wordCount", () => {
  it("counts words correctly", () => {
    expect(wordCount("hello world")).toBe(2);
  });

  it("handles multiple spaces", () => {
    expect(wordCount("hello   world")).toBe(2);
  });

  it("returns 0 for empty string", () => {
    expect(wordCount("")).toBe(0);
  });

  it("returns 0 for whitespace only", () => {
    expect(wordCount("   ")).toBe(0);
  });

  it("counts single word", () => {
    expect(wordCount("hello")).toBe(1);
  });
});

describe("formatWordCount", () => {
  it("returns 'Empty' for 0", () => {
    expect(formatWordCount(0)).toBe("Empty");
  });

  it("returns singular for 1", () => {
    expect(formatWordCount(1)).toBe("1 word");
  });

  it("returns plural for > 1", () => {
    expect(formatWordCount(42)).toBe("42 words");
  });
});
