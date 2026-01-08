import { describe, expect, it } from "bun:test";
import {
  filterTestSetByTags,
  RAG_EVAL_SET,
  runEvaluationSet,
  SEARCH_EVAL_SET,
  type TestCaseResult,
} from "../test-sets";

describe("SEARCH_EVAL_SET", () => {
  it("has required fields", () => {
    expect(SEARCH_EVAL_SET.name).toBe("search-eval-v1");
    expect(SEARCH_EVAL_SET.version).toBeDefined();
    expect(SEARCH_EVAL_SET.cases.length).toBeGreaterThanOrEqual(10);
  });

  it("all cases have required structure", () => {
    for (const testCase of SEARCH_EVAL_SET.cases) {
      expect(testCase.id).toBeDefined();
      expect(testCase.query).toBeDefined();
      expect(testCase.expectedResultIds).toBeDefined();
      expect(testCase.expectedMinResults).toBeDefined();
      expect(testCase.tags.length).toBeGreaterThan(0);
    }
  });

  it("includes edge cases", () => {
    const edgeCases = SEARCH_EVAL_SET.cases.filter((c) =>
      c.tags.includes("edge-case")
    );

    expect(edgeCases.length).toBeGreaterThanOrEqual(2);
  });

  it("includes gibberish query test", () => {
    const gibberishCase = SEARCH_EVAL_SET.cases.find((c) =>
      c.tags.includes("gibberish")
    );

    expect(gibberishCase).toBeDefined();
    expect(gibberishCase?.expectedMinResults).toBe(0);
  });
});

describe("RAG_EVAL_SET", () => {
  it("has required fields", () => {
    expect(RAG_EVAL_SET.name).toBe("rag-eval-v1");
    expect(RAG_EVAL_SET.version).toBeDefined();
    expect(RAG_EVAL_SET.cases.length).toBeGreaterThanOrEqual(10);
  });

  it("all cases have required structure", () => {
    for (const testCase of RAG_EVAL_SET.cases) {
      expect(testCase.id).toBeDefined();
      expect(testCase.query).toBeDefined();
      expect(typeof testCase.context).toBe("string");
      expect(testCase.expectedAnswer).toBeDefined();
      expect(typeof testCase.expectedCitations).toBe("number");
      expect(typeof testCase.groundingThreshold).toBe("number");
      expect(testCase.tags.length).toBeGreaterThan(0);
    }
  });

  it("includes hallucination test", () => {
    const hallucinationCase = RAG_EVAL_SET.cases.find((c) =>
      c.tags.includes("hallucination-test")
    );

    expect(hallucinationCase).toBeDefined();
    expect(hallucinationCase?.groundingThreshold).toBe(0);
  });

  it("includes no-context edge case", () => {
    const noContextCase = RAG_EVAL_SET.cases.find(
      (c) => c.context === "" && c.tags.includes("edge-case")
    );

    expect(noContextCase).toBeDefined();
    expect(noContextCase?.expectedCitations).toBe(0);
  });

  it("includes prompt injection test", () => {
    const injectionCase = RAG_EVAL_SET.cases.find((c) =>
      c.tags.includes("prompt-injection")
    );

    expect(injectionCase).toBeDefined();
  });
});

describe("runEvaluationSet", () => {
  it("runs evaluator on all cases", async () => {
    const smallSet = {
      name: "test-set",
      description: "Test",
      version: "1.0.0",
      cases: [
        { id: "1", value: 10 },
        { id: "2", value: 20 },
        { id: "3", value: 30 },
      ],
    };

    const evaluator = async (testCase: {
      id: string;
      value: number;
    }): Promise<TestCaseResult> => ({
      id: testCase.id,
      passed: testCase.value >= 20,
      score: testCase.value / 100,
      details: {},
      durationMs: 10,
    });

    const result = await runEvaluationSet(smallSet, evaluator);

    expect(result.totalCases).toBe(3);
    expect(result.passedCases).toBe(2);
    expect(result.failedCases).toBe(1);
    expect(result.averageScore).toBeCloseTo(0.2, 2);
    expect(result.results).toHaveLength(3);
  });

  it("handles empty test set", async () => {
    const emptySet = {
      name: "empty",
      description: "Empty",
      version: "1.0.0",
      cases: [],
    };

    const result = await runEvaluationSet(emptySet, async () => ({
      id: "x",
      passed: true,
      score: 1,
      details: {},
      durationMs: 0,
    }));

    expect(result.totalCases).toBe(0);
    expect(result.averageScore).toBe(0);
  });

  it("includes run timestamp", async () => {
    const testSet = {
      name: "test",
      description: "Test",
      version: "1.0.0",
      cases: [{ id: "1" }],
    };

    const before = new Date();
    const result = await runEvaluationSet(testSet, async () => ({
      id: "1",
      passed: true,
      score: 1,
      details: {},
      durationMs: 0,
    }));
    const after = new Date();

    expect(result.runAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.runAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

describe("filterTestSetByTags", () => {
  const testSet = {
    name: "test",
    description: "Test",
    version: "1.0.0",
    cases: [
      { id: "1", tags: ["auth", "security"] },
      { id: "2", tags: ["database", "migration"] },
      { id: "3", tags: ["auth", "edge-case"] },
      { id: "4", tags: ["api", "performance"] },
    ],
  };

  it("filters by include tags", () => {
    const filtered = filterTestSetByTags(testSet, ["auth"]);

    expect(filtered.cases).toHaveLength(2);
    expect(filtered.cases.map((c) => c.id)).toContain("1");
    expect(filtered.cases.map((c) => c.id)).toContain("3");
  });

  it("filters by exclude tags", () => {
    const filtered = filterTestSetByTags(testSet, undefined, ["edge-case"]);

    expect(filtered.cases).toHaveLength(3);
    expect(filtered.cases.map((c) => c.id)).not.toContain("3");
  });

  it("combines include and exclude", () => {
    const filtered = filterTestSetByTags(testSet, ["auth"], ["edge-case"]);

    expect(filtered.cases).toHaveLength(1);
    expect(filtered.cases[0]?.id).toBe("1");
  });

  it("returns all when no filters", () => {
    const filtered = filterTestSetByTags(testSet);

    expect(filtered.cases).toHaveLength(4);
  });

  it("preserves test set metadata", () => {
    const filtered = filterTestSetByTags(testSet, ["auth"]);

    expect(filtered.name).toBe("test");
    expect(filtered.version).toBe("1.0.0");
  });
});
