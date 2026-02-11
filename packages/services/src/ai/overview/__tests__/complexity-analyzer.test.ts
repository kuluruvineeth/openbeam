import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import {
  analyzeQueryComplexity,
  selectModelForComplexity,
} from "../complexity-analyzer";

const WORD_PATTERN = /^\w{2,8}$/;

describe("analyzeQueryComplexity", () => {
  describe("simple queries", () => {
    test("classifies short factual queries as simple", () => {
      expect(analyzeQueryComplexity("What is my email?")).toBe("simple");
      expect(analyzeQueryComplexity("PTO policy")).toBe("simple");
      expect(analyzeQueryComplexity("office address")).toBe("simple");
      expect(analyzeQueryComplexity("company handbook")).toBe("simple");
    });
  });

  describe("moderate queries", () => {
    test("classifies procedural queries appropriately", () => {
      expect(analyzeQueryComplexity("How do I submit expenses?")).toBe(
        "moderate"
      );
      expect(analyzeQueryComplexity("What are the steps for onboarding?")).toBe(
        "simple"
      );
      expect(
        analyzeQueryComplexity("How do I process the steps for onboarding?")
      ).toBe("moderate");
    });

    test("classifies comparison queries appropriately", () => {
      expect(analyzeQueryComplexity("Compare A vs B")).toBe("simple");
      expect(
        analyzeQueryComplexity("What is the difference between X and Y")
      ).toBe("moderate");
    });
  });

  describe("complex queries", () => {
    test("classifies analytical queries as complex", () => {
      expect(
        analyzeQueryComplexity(
          "Compare our Q4 roadmap with Q3 achievements and analyze gaps"
        )
      ).toBe("complex");
      expect(
        analyzeQueryComplexity(
          "Why did revenue decline last quarter compared to the previous year?"
        )
      ).toBe("complex");
    });

    test("classifies analytical queries appropriately", () => {
      expect(
        analyzeQueryComplexity("Analyze the impact of recent changes on sales")
      ).toBe("moderate");
      expect(
        analyzeQueryComplexity(
          "Analyze and compare the impact of changes on sales and revenue"
        )
      ).toBe("complex");
    });
  });

  describe("pattern detection", () => {
    test("detects comparison patterns", () => {
      expect(analyzeQueryComplexity("compare A and B")).toBe("moderate");
      expect(analyzeQueryComplexity("difference between A and B")).toBe(
        "moderate"
      );
      expect(analyzeQueryComplexity("A versus B")).toBe("simple");
      expect(analyzeQueryComplexity("A vs B")).toBe("simple");
    });

    test("detects temporal patterns", () => {
      expect(analyzeQueryComplexity("recent updates")).toBe("simple");
      expect(analyzeQueryComplexity("last quarter report")).toBe("simple");
    });

    test("detects aggregation patterns", () => {
      expect(analyzeQueryComplexity("total sales")).toBe("simple");
      expect(analyzeQueryComplexity("average response time")).toBe("simple");
    });
  });

  describe("property-based tests", () => {
    test("always returns valid complexity level", () => {
      fc.assert(
        fc.property(fc.string(), (query) => {
          const result = analyzeQueryComplexity(query);
          return ["simple", "moderate", "complex"].includes(result);
        })
      );
    });

    test("is deterministic", () => {
      fc.assert(
        fc.property(fc.string(), (query) => {
          const first = analyzeQueryComplexity(query);
          const second = analyzeQueryComplexity(query);
          return first === second;
        })
      );
    });

    test("queries with analytical keywords tend toward higher complexity", () => {
      const analyticalKeywords = ["why", "how", "explain", "analyze"];
      fc.assert(
        fc.property(
          fc.constantFrom(...analyticalKeywords),
          fc.array(fc.stringMatching(WORD_PATTERN), {
            minLength: 3,
            maxLength: 8,
          }),
          (keyword, words) => {
            const query = `${keyword} ${words.join(" ")}`;
            const result = analyzeQueryComplexity(query);
            return ["moderate", "complex"].includes(result);
          }
        )
      );
    });
  });
});

describe("selectModelForComplexity", () => {
  test("returns fast model for simple queries", () => {
    const config = selectModelForComplexity("simple");
    expect(config.modelId).toBe("gemini-3-flash-preview");
    expect(config.providerId).toBe("google");
  });

  test("returns balanced model for moderate queries", () => {
    const config = selectModelForComplexity("moderate");
    expect(config.modelId).toBe("gemini-3-flash-preview");
    expect(config.providerId).toBe("google");
  });

  test("returns capable model for complex queries", () => {
    const config = selectModelForComplexity("complex");
    expect(config.modelId).toBe("gemini-3-pro-preview");
    expect(config.providerId).toBe("google");
  });

  test("all complexity levels have valid model config", () => {
    const complexities: Array<"simple" | "moderate" | "complex"> = [
      "simple",
      "moderate",
      "complex",
    ];

    for (const complexity of complexities) {
      const config = selectModelForComplexity(complexity);
      expect(config.modelId).toBeTruthy();
      expect(config.providerId).toBeTruthy();
    }
  });
});
