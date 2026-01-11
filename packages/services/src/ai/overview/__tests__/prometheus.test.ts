import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  getOverviewMetrics,
  getOverviewRegistry,
  recordOverviewMetrics,
  resetOverviewPrometheusMetrics,
  updateCacheHitRates,
} from "../prometheus";

describe("Prometheus metrics", () => {
  beforeEach(() => {
    resetOverviewPrometheusMetrics();
  });

  afterEach(() => {
    resetOverviewPrometheusMetrics();
  });

  describe("recordOverviewMetrics", () => {
    it("increments request counter with correct labels", async () => {
      recordOverviewMetrics({
        status: "success",
        cacheHit: false,
        model: "gemini-2.5-flash",
        complexity: "simple",
        latencyMs: 250,
      });

      const metrics = await getOverviewMetrics();
      expect(metrics).toContain("overview_requests_total");
      expect(metrics).toContain('status="success"');
      expect(metrics).toContain('model="gemini-2.5-flash"');
      expect(metrics).toContain('complexity="simple"');
    });

    it("records latency in histogram", async () => {
      recordOverviewMetrics({
        status: "success",
        cacheHit: false,
        model: "gemini-2.5-flash",
        complexity: "moderate",
        latencyMs: 350,
      });

      const metrics = await getOverviewMetrics();
      expect(metrics).toContain("overview_latency_ms");
    });

    it("records token usage when provided", async () => {
      recordOverviewMetrics({
        status: "success",
        cacheHit: false,
        model: "gemini-2.5-flash",
        complexity: "simple",
        latencyMs: 200,
        promptTokens: 1000,
        completionTokens: 500,
      });

      const metrics = await getOverviewMetrics();
      expect(metrics).toContain("overview_tokens_total");
      expect(metrics).toContain('type="prompt"');
      expect(metrics).toContain('type="completion"');
    });

    it("records grounding score when provided", async () => {
      recordOverviewMetrics({
        status: "success",
        cacheHit: false,
        model: "gemini-2.5-flash",
        complexity: "simple",
        latencyMs: 200,
        groundingScore: 0.85,
      });

      const metrics = await getOverviewMetrics();
      expect(metrics).toContain("overview_grounding_score");
    });

    it("records source count when provided", async () => {
      recordOverviewMetrics({
        status: "success",
        cacheHit: false,
        model: "gemini-2.5-flash",
        complexity: "simple",
        latencyMs: 200,
        sourceCount: 5,
      });

      const metrics = await getOverviewMetrics();
      expect(metrics).toContain("overview_source_count");
    });

    it("records cache hit correctly", async () => {
      recordOverviewMetrics({
        status: "cached",
        cacheHit: true,
        model: "cached",
        complexity: "simple",
        latencyMs: 50,
      });

      const metrics = await getOverviewMetrics();
      expect(metrics).toContain('cache_hit="true"');
    });
  });

  describe("updateCacheHitRates", () => {
    it("updates all cache hit rate gauges", async () => {
      updateCacheHitRates({
        semantic: 0.25,
        search: 0.4,
        embedding: 0.6,
      });

      const metrics = await getOverviewMetrics();
      expect(metrics).toContain("overview_semantic_cache_hit_rate");
      expect(metrics).toContain("overview_search_cache_hit_rate");
      expect(metrics).toContain("overview_embedding_cache_hit_rate");
    });
  });

  describe("getOverviewRegistry", () => {
    it("returns the registry", () => {
      const registry = getOverviewRegistry();
      expect(registry).toBeDefined();
    });
  });

  describe("getOverviewMetrics", () => {
    it("returns prometheus format string", async () => {
      recordOverviewMetrics({
        status: "success",
        cacheHit: false,
        model: "test-model",
        complexity: "simple",
        latencyMs: 100,
      });

      const metrics = await getOverviewMetrics();
      expect(typeof metrics).toBe("string");
      expect(metrics).toContain("# HELP");
      expect(metrics).toContain("# TYPE");
    });
  });

  describe("resetOverviewPrometheusMetrics", () => {
    it("resets all metrics", async () => {
      recordOverviewMetrics({
        status: "success",
        cacheHit: false,
        model: "test-model",
        complexity: "simple",
        latencyMs: 100,
      });

      resetOverviewPrometheusMetrics();

      const metrics = await getOverviewMetrics();
      expect(metrics).not.toContain("test-model");
    });
  });
});
