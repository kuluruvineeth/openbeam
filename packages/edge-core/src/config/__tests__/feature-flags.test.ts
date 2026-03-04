import { describe, expect, test } from "bun:test";
import type { EdgeTier } from "@openplane/types/edge/tiers";
import { type FeatureFlags, getFeatureFlags } from "../feature-flags";

describe("getFeatureFlags", () => {
  test("sensor_gateway has only fts", () => {
    const flags = getFeatureFlags("sensor_gateway");

    expect(flags.fts).toBe(true);
    expect(flags.vector).toBe(false);
    expect(flags.slm).toBe(false);
    expect(flags.rag).toBe(false);
    expect(flags.fl).toBe(false);
    expect(flags.conversational).toBe(false);
    expect(flags.ner).toBe(false);
  });

  test("standard has fts and vector", () => {
    const flags = getFeatureFlags("standard");

    expect(flags.fts).toBe(true);
    expect(flags.vector).toBe(true);
    expect(flags.slm).toBe(false);
    expect(flags.rag).toBe(false);
    expect(flags.fl).toBe(false);
    expect(flags.conversational).toBe(false);
    expect(flags.ner).toBe(false);
  });

  test("performance has fts, vector, slm, rag, conversational, ner", () => {
    const flags = getFeatureFlags("performance");

    expect(flags.fts).toBe(true);
    expect(flags.vector).toBe(true);
    expect(flags.slm).toBe(true);
    expect(flags.rag).toBe(true);
    expect(flags.fl).toBe(false);
    expect(flags.conversational).toBe(true);
    expect(flags.ner).toBe(true);
  });

  test("enterprise has all features", () => {
    const flags = getFeatureFlags("enterprise");

    expect(flags.fts).toBe(true);
    expect(flags.vector).toBe(true);
    expect(flags.slm).toBe(true);
    expect(flags.rag).toBe(true);
    expect(flags.fl).toBe(true);
    expect(flags.conversational).toBe(true);
    expect(flags.ner).toBe(true);
  });

  test("each tier is a superset of the previous", () => {
    const tiers: EdgeTier[] = [
      "sensor_gateway",
      "standard",
      "performance",
      "enterprise",
    ];

    for (let i = 1; i < tiers.length; i += 1) {
      const prev = getFeatureFlags(tiers[i - 1] as EdgeTier);
      const curr = getFeatureFlags(tiers[i] as EdgeTier);
      const flagKeys: (keyof FeatureFlags)[] = [
        "fts",
        "vector",
        "slm",
        "rag",
        "fl",
        "conversational",
        "ner",
      ];

      for (const key of flagKeys) {
        if (prev[key]) {
          expect(curr[key]).toBe(true);
        }
      }
    }
  });

  test("return type has all expected keys", () => {
    const flags = getFeatureFlags("standard");
    const expectedKeys: (keyof FeatureFlags)[] = [
      "fts",
      "vector",
      "slm",
      "rag",
      "fl",
      "conversational",
      "ner",
    ];

    for (const key of expectedKeys) {
      expect(typeof flags[key]).toBe("boolean");
    }
  });

  test("no extra keys in returned object", () => {
    const flags = getFeatureFlags("enterprise");
    const keys = Object.keys(flags);

    expect(keys.sort()).toEqual([
      "conversational",
      "fl",
      "fts",
      "ner",
      "rag",
      "slm",
      "vector",
    ]);
  });

  test("returns distinct objects for different tiers", () => {
    const a = getFeatureFlags("sensor_gateway");
    const b = getFeatureFlags("enterprise");

    expect(a).not.toBe(b);
    expect(a.fl).toBe(false);
    expect(b.fl).toBe(true);
  });
});
