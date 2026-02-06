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
} from "../utils/type-guards";

describe("isRetryTargetType", () => {
  it("returns false for forbidden types", () => {
    const forbidden: ExecutionPlanNode["type"][] = [
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

    for (const type of forbidden) {
      expect(isRetryTargetType(type)).toBe(false);
    }
  });

  it("returns true for allowed types", () => {
    const allowed: ExecutionPlanNode["type"][] = [
      "transform",
      "filter",
      "code",
      "template",
      "http_request",
      "llm",
      "agent_call",
    ];

    for (const type of allowed) {
      expect(isRetryTargetType(type)).toBe(true);
    }
  });

  it("matches RETRY_FORBIDDEN_TARGET_TYPES set", () => {
    for (const type of RETRY_FORBIDDEN_TARGET_TYPES) {
      expect(isRetryTargetType(type as ExecutionPlanNode["type"])).toBe(false);
    }
  });
});

describe("isTryCatchTryTargetType", () => {
  it("returns false for forbidden types", () => {
    const forbidden: ExecutionPlanNode["type"][] = [
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

    for (const type of forbidden) {
      expect(isTryCatchTryTargetType(type)).toBe(false);
    }
  });

  it("returns true for allowed types", () => {
    const allowed: ExecutionPlanNode["type"][] = [
      "transform",
      "filter",
      "http_request",
      "database_query",
    ];

    for (const type of allowed) {
      expect(isTryCatchTryTargetType(type)).toBe(true);
    }
  });

  it("matches TRY_CATCH_TRY_FORBIDDEN_TARGET_TYPES set", () => {
    for (const type of TRY_CATCH_TRY_FORBIDDEN_TARGET_TYPES) {
      expect(isTryCatchTryTargetType(type as ExecutionPlanNode["type"])).toBe(
        false
      );
    }
  });
});

describe("isTryCatchCatchTargetType", () => {
  it("returns false for forbidden types", () => {
    const forbidden: ExecutionPlanNode["type"][] = [
      "start",
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

    for (const type of forbidden) {
      expect(isTryCatchCatchTargetType(type)).toBe(false);
    }
  });

  it("returns true for allowed types including end", () => {
    const allowed: ExecutionPlanNode["type"][] = [
      "end",
      "transform",
      "filter",
      "notify",
    ];

    for (const type of allowed) {
      expect(isTryCatchCatchTargetType(type)).toBe(true);
    }
  });

  it("matches TRY_CATCH_CATCH_FORBIDDEN_TARGET_TYPES set", () => {
    for (const type of TRY_CATCH_CATCH_FORBIDDEN_TARGET_TYPES) {
      expect(isTryCatchCatchTargetType(type as ExecutionPlanNode["type"])).toBe(
        false
      );
    }
  });
});

describe("isParallelMapTargetType", () => {
  it("returns false for forbidden types", () => {
    const forbidden: ExecutionPlanNode["type"][] = [
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
      "parallel_map",
    ];

    for (const type of forbidden) {
      expect(isParallelMapTargetType(type)).toBe(false);
    }
  });

  it("returns true for allowed types", () => {
    const allowed: ExecutionPlanNode["type"][] = [
      "transform",
      "filter",
      "llm",
      "http_request",
      "embeddings",
    ];

    for (const type of allowed) {
      expect(isParallelMapTargetType(type)).toBe(true);
    }
  });

  it("matches PARALLEL_MAP_FORBIDDEN_TARGET_TYPES set", () => {
    for (const type of PARALLEL_MAP_FORBIDDEN_TARGET_TYPES) {
      expect(isParallelMapTargetType(type as ExecutionPlanNode["type"])).toBe(
        false
      );
    }
  });
});

describe("resolveNodeConfig", () => {
  it("extracts config from data object", () => {
    const data = {
      config: { maxAttempts: 3, backoffMs: 1000 },
    };

    const result = resolveNodeConfig(data);

    expect(result).toEqual({ maxAttempts: 3, backoffMs: 1000 });
  });

  it("returns data as-is when no config property", () => {
    const data = { maxAttempts: 3, backoffMs: 1000 };

    const result = resolveNodeConfig(data);

    expect(result).toEqual({ maxAttempts: 3, backoffMs: 1000 });
  });

  it("returns null for null input", () => {
    const result = resolveNodeConfig(null);

    expect(result).toBeNull();
  });

  it("returns undefined for undefined input", () => {
    const result = resolveNodeConfig(undefined);

    expect(result).toBeUndefined();
  });

  it("returns primitive values as-is", () => {
    expect(resolveNodeConfig("string")).toBe("string");
    expect(resolveNodeConfig(123)).toBe(123);
    expect(resolveNodeConfig(true)).toBe(true);
  });

  it("handles nested config", () => {
    const data = {
      config: {
        branches: [{ id: "a" }, { id: "b" }],
        condition: "expression",
      },
    };

    const result = resolveNodeConfig(data);

    expect(result).toEqual({
      branches: [{ id: "a" }, { id: "b" }],
      condition: "expression",
    });
  });
});

describe("isRecord", () => {
  it("returns true for plain object", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ key: "value" })).toBe(true);
  });

  it("returns false for null", () => {
    expect(isRecord(null)).toBe(false);
  });

  it("returns false for array", () => {
    expect(isRecord([])).toBe(false);
    expect(isRecord([1, 2, 3])).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isRecord("string")).toBe(false);
    expect(isRecord(123)).toBe(false);
    expect(isRecord(true)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
  });

  it("returns true for object with prototype", () => {
    class MyClass {
      value = 1;
    }
    expect(isRecord(new MyClass())).toBe(true);
  });
});
