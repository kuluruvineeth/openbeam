import type { ExecutionPlanNode } from "@openplane/types/canvas";
import { describe, expect, it } from "vitest";
import {
  isParallelMapTargetType,
  isRecord,
  isRetryTargetType,
  isTryCatchCatchTargetType,
  isTryCatchTryTargetType,
  PARALLEL_MAP_FORBIDDEN_TARGET_TYPES,
  RETRY_FORBIDDEN_TARGET_TYPES,
  resolveNodeConfig,
  TRY_CATCH_CATCH_FORBIDDEN_TARGET_TYPES,
  TRY_CATCH_TRY_FORBIDDEN_TARGET_TYPES,
} from "../workflows/canvas/utils/type-guards";

type NodeType = ExecutionPlanNode["type"];

describe("resolveNodeConfig", () => {
  it("extracts config from data.config", () => {
    const result = resolveNodeConfig({ config: { key: "value" } });
    expect(result).toEqual({ key: "value" });
  });

  it("returns data directly when no config key", () => {
    const data = { key: "value" };
    const result = resolveNodeConfig(data);
    expect(result).toEqual({ key: "value" });
  });

  it("returns null for null input", () => {
    expect(resolveNodeConfig(null)).toBeNull();
  });

  it("returns undefined for undefined input", () => {
    expect(resolveNodeConfig(undefined)).toBeUndefined();
  });

  it("returns primitive for primitive input", () => {
    expect(resolveNodeConfig("string")).toBe("string");
    expect(resolveNodeConfig(42)).toBe(42);
  });
});

describe("isRetryTargetType", () => {
  it("allows transform nodes", () => {
    expect(isRetryTargetType("transform")).toBe(true);
  });

  it("allows tool nodes", () => {
    expect(isRetryTargetType("tool")).toBe(true);
  });

  it("allows llm nodes", () => {
    expect(isRetryTargetType("llm")).toBe(true);
  });

  it("forbids all types in RETRY_FORBIDDEN_TARGET_TYPES", () => {
    for (const type of RETRY_FORBIDDEN_TARGET_TYPES) {
      expect(isRetryTargetType(type as NodeType)).toBe(false);
    }
  });

  it("forbids start, end, condition", () => {
    expect(isRetryTargetType("start")).toBe(false);
    expect(isRetryTargetType("end")).toBe(false);
    expect(isRetryTargetType("condition")).toBe(false);
  });
});

describe("isTryCatchTryTargetType", () => {
  it("allows transform nodes", () => {
    expect(isTryCatchTryTargetType("transform")).toBe(true);
  });

  it("forbids all types in TRY_CATCH_TRY_FORBIDDEN_TARGET_TYPES", () => {
    for (const type of TRY_CATCH_TRY_FORBIDDEN_TARGET_TYPES) {
      expect(isTryCatchTryTargetType(type as NodeType)).toBe(false);
    }
  });
});

describe("isTryCatchCatchTargetType", () => {
  it("allows end nodes as catch targets", () => {
    expect(isTryCatchCatchTargetType("end")).toBe(true);
  });

  it("allows transform nodes", () => {
    expect(isTryCatchCatchTargetType("transform")).toBe(true);
  });

  it("forbids all types in TRY_CATCH_CATCH_FORBIDDEN_TARGET_TYPES", () => {
    for (const type of TRY_CATCH_CATCH_FORBIDDEN_TARGET_TYPES) {
      expect(isTryCatchCatchTargetType(type as NodeType)).toBe(false);
    }
  });

  it("forbids start as catch target", () => {
    expect(isTryCatchCatchTargetType("start")).toBe(false);
  });
});

describe("isParallelMapTargetType", () => {
  it("allows transform nodes", () => {
    expect(isParallelMapTargetType("transform")).toBe(true);
  });

  it("forbids all types in PARALLEL_MAP_FORBIDDEN_TARGET_TYPES", () => {
    for (const type of PARALLEL_MAP_FORBIDDEN_TARGET_TYPES) {
      expect(isParallelMapTargetType(type as NodeType)).toBe(false);
    }
  });

  it("forbids parallel_map (no nesting)", () => {
    expect(isParallelMapTargetType("parallel_map")).toBe(false);
  });
});

describe("isRecord", () => {
  it("returns true for plain objects", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ key: "value" })).toBe(true);
  });

  it("returns false for null", () => {
    expect(isRecord(null)).toBe(false);
  });

  it("returns false for arrays", () => {
    expect(isRecord([])).toBe(false);
    expect(isRecord([1, 2, 3])).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isRecord("string")).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord(true)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
  });
});

describe("forbidden type sets", () => {
  it("RETRY_FORBIDDEN_TARGET_TYPES contains control flow nodes", () => {
    const expected = [
      "start",
      "end",
      "condition",
      "approval",
      "input",
      "sub_workflow",
      "loop",
      "parallel_split",
      "parallel_join",
      "retry",
      "try_catch",
    ];
    expect(RETRY_FORBIDDEN_TARGET_TYPES.size).toBe(expected.length);
    for (const type of expected) {
      expect(RETRY_FORBIDDEN_TARGET_TYPES.has(type)).toBe(true);
    }
  });

  it("TRY_CATCH_CATCH allows end but forbids start", () => {
    expect(TRY_CATCH_CATCH_FORBIDDEN_TARGET_TYPES.has("end")).toBe(false);
    expect(TRY_CATCH_CATCH_FORBIDDEN_TARGET_TYPES.has("start")).toBe(true);
  });

  it("PARALLEL_MAP adds parallel_map to forbidden set", () => {
    expect(PARALLEL_MAP_FORBIDDEN_TARGET_TYPES.has("parallel_map")).toBe(true);
    expect(RETRY_FORBIDDEN_TARGET_TYPES.has("parallel_map")).toBe(false);
  });
});
