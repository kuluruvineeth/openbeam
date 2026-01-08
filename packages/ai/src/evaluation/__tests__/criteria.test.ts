import { describe, expect, it } from "bun:test";
import {
  AGENT_SUCCESS_CRITERIA,
  evaluateAgentCriteria,
  evaluateCriteria,
  evaluateRAGCriteria,
  evaluateSearchCriteria,
  RAG_SUCCESS_CRITERIA,
  SEARCH_SUCCESS_CRITERIA,
} from "../criteria";

describe("evaluateCriteria", () => {
  it("passes when all metrics meet targets", () => {
    const result = evaluateCriteria(SEARCH_SUCCESS_CRITERIA, {
      relevance: 0.9,
      precision: 0.8,
      latencyP50Ms: 40,
      latencyP99Ms: 150,
    });

    expect(result.passed).toBe(true);
    expect(result.failedCriteria).toHaveLength(0);
    expect(result.overallScore).toBeGreaterThan(0.9);
  });

  it("fails when a metric misses target", () => {
    const result = evaluateCriteria(SEARCH_SUCCESS_CRITERIA, {
      relevance: 0.5,
      precision: 0.8,
      latencyP50Ms: 40,
      latencyP99Ms: 150,
    });

    expect(result.passed).toBe(false);
    expect(result.failedCriteria).toContain("relevance");
  });

  it("handles latency exceeding target", () => {
    const result = evaluateCriteria(SEARCH_SUCCESS_CRITERIA, {
      relevance: 0.9,
      precision: 0.8,
      latencyP50Ms: 100,
      latencyP99Ms: 300,
    });

    expect(result.passed).toBe(false);
    expect(result.failedCriteria).toContain("latencyP50Ms");
    expect(result.failedCriteria).toContain("latencyP99Ms");
  });

  it("returns metric values for each criterion", () => {
    const result = evaluateCriteria(SEARCH_SUCCESS_CRITERIA, {
      relevance: 0.85,
      precision: 0.75,
      latencyP50Ms: 45,
      latencyP99Ms: 180,
    });

    expect(result.metrics).toHaveLength(4);
    expect(result.metrics.find((m) => m.name === "relevance")?.value).toBe(
      0.85
    );
    expect(result.metrics.find((m) => m.name === "precision")?.value).toBe(
      0.75
    );
  });

  it("handles missing metrics as zero", () => {
    const result = evaluateCriteria(SEARCH_SUCCESS_CRITERIA, {
      relevance: 0.9,
    });

    expect(result.passed).toBe(false);
    expect(result.metrics.find((m) => m.name === "precision")?.value).toBe(0);
  });
});

describe("evaluateSearchCriteria", () => {
  it("evaluates search-specific metrics", () => {
    const result = evaluateSearchCriteria({
      relevance: 0.85,
      precision: 0.75,
      latencyP50Ms: 45,
      latencyP99Ms: 180,
    });

    expect(result.category).toBe("search");
    expect(result.passed).toBe(true);
  });
});

describe("evaluateRAGCriteria", () => {
  it("evaluates RAG-specific metrics", () => {
    const result = evaluateRAGCriteria({
      groundingScore: 0.85,
      accuracy: 0.9,
      citationCoverage: 0.95,
      responseCompleteness: 0.8,
    });

    expect(result.category).toBe("rag");
    expect(result.passed).toBe(true);
    expect(result.overallScore).toBeGreaterThan(0.8);
  });

  it("fails on low grounding score", () => {
    const result = evaluateRAGCriteria({
      groundingScore: 0.5,
      accuracy: 0.9,
      citationCoverage: 0.95,
      responseCompleteness: 0.8,
    });

    expect(result.passed).toBe(false);
    expect(result.failedCriteria).toContain("groundingScore");
  });
});

describe("evaluateAgentCriteria", () => {
  it("evaluates agent-specific metrics", () => {
    const result = evaluateAgentCriteria({
      taskCompletionRate: 0.98,
      verificationPassRate: 0.95,
      efficiency: 0.8,
      avgIterations: 2.5,
    });

    expect(result.category).toBe("agent");
    expect(result.passed).toBe(true);
  });

  it("fails on too many iterations", () => {
    const result = evaluateAgentCriteria({
      taskCompletionRate: 0.98,
      verificationPassRate: 0.95,
      efficiency: 0.8,
      avgIterations: 5,
    });

    expect(result.passed).toBe(false);
    expect(result.failedCriteria).toContain("avgIterations");
  });
});

describe("SUCCESS_CRITERIA constants", () => {
  it("search criteria have correct category", () => {
    expect(SEARCH_SUCCESS_CRITERIA.category).toBe("search");
    expect(SEARCH_SUCCESS_CRITERIA.criteria.length).toBeGreaterThan(0);
  });

  it("RAG criteria have correct category", () => {
    expect(RAG_SUCCESS_CRITERIA.category).toBe("rag");
    expect(RAG_SUCCESS_CRITERIA.criteria.length).toBeGreaterThan(0);
  });

  it("agent criteria have correct category", () => {
    expect(AGENT_SUCCESS_CRITERIA.category).toBe("agent");
    expect(AGENT_SUCCESS_CRITERIA.criteria.length).toBeGreaterThan(0);
  });

  it("all criteria weights sum to 1", () => {
    const searchWeight = SEARCH_SUCCESS_CRITERIA.criteria.reduce(
      (sum, c) => sum + c.weight,
      0
    );
    const ragWeight = RAG_SUCCESS_CRITERIA.criteria.reduce(
      (sum, c) => sum + c.weight,
      0
    );
    const agentWeight = AGENT_SUCCESS_CRITERIA.criteria.reduce(
      (sum, c) => sum + c.weight,
      0
    );

    expect(searchWeight).toBeCloseTo(1, 2);
    expect(ragWeight).toBeCloseTo(1, 2);
    expect(agentWeight).toBeCloseTo(1, 2);
  });
});
