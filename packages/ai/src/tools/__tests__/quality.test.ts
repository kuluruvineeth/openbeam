import { describe, expect, it } from "bun:test";
import type { ErrorCode, ToolExecutionResult } from "@openplane/types/ai";
import {
  createErrorResult,
  createSuccessResult,
  failure,
  success,
} from "../builder";
import { ERROR_CODES } from "../types";

const ACTIONABLE_PATTERNS = [
  /try/i,
  /check/i,
  /verify/i,
  /wait/i,
  /use/i,
  /report/i,
];

describe("Tool Description Quality", () => {
  describe("USE THIS WHEN / DO NOT USE WHEN pattern", () => {
    const validateDescriptionPattern = (description: string): string[] => {
      const issues: string[] = [];

      if (!description.includes("USE THIS WHEN")) {
        issues.push("Missing 'USE THIS WHEN' section");
      }

      if (!description.includes("DO NOT USE WHEN")) {
        issues.push("Missing 'DO NOT USE WHEN' section");
      }

      if (description.length < 100) {
        issues.push("Description too short (less than 100 characters)");
      }

      if (
        !(description.includes("RETURNS") || description.includes("Returns"))
      ) {
        issues.push("Missing return value description");
      }

      return issues;
    };

    it("validates complete description pattern", () => {
      const goodDescription = `Search across all connected data sources using hybrid semantic + keyword search.

USE THIS WHEN:
- You need to find documents or information
- User asks a question requiring data lookup
- You need context before answering

DO NOT USE WHEN:
- You already have the information needed
- The query is about conversation history

RETURNS: Array of matching documents with relevance scores.`;

      const issues = validateDescriptionPattern(goodDescription);
      expect(issues).toEqual([]);
    });

    it("identifies missing USE THIS WHEN section", () => {
      const incompleteDesc = `Search documents in the database.

DO NOT USE WHEN:
- You already have the data

RETURNS: Search results.`;

      const issues = validateDescriptionPattern(incompleteDesc);
      expect(issues).toContain("Missing 'USE THIS WHEN' section");
    });

    it("identifies missing DO NOT USE WHEN section", () => {
      const incompleteDesc = `Search documents in the database.

USE THIS WHEN:
- You need to find something

RETURNS: Search results.`;

      const issues = validateDescriptionPattern(incompleteDesc);
      expect(issues).toContain("Missing 'DO NOT USE WHEN' section");
    });

    it("identifies missing return description", () => {
      const incompleteDesc = `Search documents.

USE THIS WHEN:
- You need to find something

DO NOT USE WHEN:
- You have the data already`;

      const issues = validateDescriptionPattern(incompleteDesc);
      expect(issues).toContain("Missing return value description");
    });
  });

  describe("Parameter descriptions", () => {
    const validateParameterDescriptions = (
      schema: Record<string, { describe?: string }>
    ): string[] => {
      const issues: string[] = [];

      for (const [name, field] of Object.entries(schema)) {
        if (!field.describe) {
          issues.push(`Parameter '${name}' missing .describe()`);
        } else if (field.describe.length < 10) {
          issues.push(`Parameter '${name}' description too short`);
        }
      }

      return issues;
    };

    it("validates parameters have descriptions", () => {
      const goodSchema = {
        query: { describe: "The search query to execute against the database" },
        limit: { describe: "Maximum number of results to return (1-100)" },
      };

      const issues = validateParameterDescriptions(goodSchema);
      expect(issues).toEqual([]);
    });

    it("identifies missing parameter descriptions", () => {
      const badSchema = {
        query: { describe: "The search query" },
        limit: {},
      };

      const issues = validateParameterDescriptions(badSchema);
      expect(issues).toContain("Parameter 'limit' missing .describe()");
    });

    it("identifies too short parameter descriptions", () => {
      const badSchema = {
        query: { describe: "Query" },
      };

      const issues = validateParameterDescriptions(badSchema);
      expect(issues).toContain("Parameter 'query' description too short");
    });
  });
});

describe("Structured Error Handling", () => {
  describe("success helper", () => {
    it("creates success result with data", () => {
      const result = success({ items: [1, 2, 3], count: 3 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ items: [1, 2, 3], count: 3 });
      expect(result.error).toBeUndefined();
    });

    it("includes metadata when provided", () => {
      const result = success(
        { value: "test" },
        { latencyMs: 150, source: "cache" }
      );

      expect(result.metadata?.latencyMs).toBe(150);
      expect(result.metadata?.source).toBe("cache");
    });

    it("defaults latencyMs to 0", () => {
      const result = success({ value: "test" });

      expect(result.metadata?.latencyMs).toBe(0);
    });
  });

  describe("failure helper", () => {
    it("creates failure result with error code", () => {
      const result = failure("NOT_FOUND");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
      expect(result.error?.retryable).toBe(false);
    });

    it("uses default message from ERROR_CODES", () => {
      const result = failure("RATE_LIMITED");

      expect(result.error?.message).toBe(ERROR_CODES.RATE_LIMITED.description);
    });

    it("allows custom message override", () => {
      const result = failure("NOT_FOUND", "User profile not found");

      expect(result.error?.message).toBe("User profile not found");
    });

    it("includes suggestion from ERROR_CODES", () => {
      const result = failure("TIMEOUT");

      expect(result.error?.suggestion).toBe(
        ERROR_CODES.TIMEOUT.defaultSuggestion
      );
    });

    it("allows custom suggestion override", () => {
      const result = failure("TIMEOUT", undefined, {
        suggestion: "Try a simpler query",
      });

      expect(result.error?.suggestion).toBe("Try a simpler query");
    });

    it("allows retryable override", () => {
      const result = failure("UNAUTHORIZED", undefined, {
        retryable: true,
      });

      expect(result.error?.retryable).toBe(true);
    });

    it("includes details when provided", () => {
      const result = failure("INVALID_INPUT", "Invalid date format", {
        details: { field: "startDate", expected: "ISO8601" },
      });

      expect(result.error?.details).toEqual({
        field: "startDate",
        expected: "ISO8601",
      });
    });
  });

  describe("createSuccessResult", () => {
    it("creates typed success result", () => {
      const result = createSuccessResult({ count: 5 });

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(5);
    });

    it("includes optional metadata", () => {
      const result = createSuccessResult(
        { items: [] },
        { latencyMs: 50, cached: true }
      );

      expect(result.metadata?.latencyMs).toBe(50);
      expect(result.metadata?.cached).toBe(true);
    });
  });

  describe("createErrorResult", () => {
    it("creates typed error result", () => {
      const result = createErrorResult<string>("PROVIDER_ERROR", "API down");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PROVIDER_ERROR");
      expect(result.error?.message).toBe("API down");
    });

    it("includes metadata when provided", () => {
      const result = createErrorResult("TIMEOUT", undefined, {
        metadata: { latencyMs: 30_000 },
      });

      expect(result.metadata?.latencyMs).toBe(30_000);
    });
  });

  describe("ERROR_CODES constant", () => {
    it("has all standard error codes", () => {
      const expectedCodes: ErrorCode[] = [
        "RATE_LIMITED",
        "UNAUTHORIZED",
        "NOT_FOUND",
        "TIMEOUT",
        "INVALID_INPUT",
        "INVALID_STATE",
        "PROVIDER_ERROR",
        "QUOTA_EXCEEDED",
        "NETWORK_ERROR",
        "INTERNAL_ERROR",
      ];

      for (const code of expectedCodes) {
        expect(ERROR_CODES[code]).toBeDefined();
      }
    });

    it("each code has description, retryable, and defaultSuggestion", () => {
      for (const [_code, info] of Object.entries(ERROR_CODES)) {
        expect(info.description).toBeTruthy();
        expect(typeof info.retryable).toBe("boolean");
        expect(info.defaultSuggestion).toBeTruthy();
      }
    });

    it("retryable is true for transient errors", () => {
      expect(ERROR_CODES.RATE_LIMITED.retryable).toBe(true);
      expect(ERROR_CODES.TIMEOUT.retryable).toBe(true);
      expect(ERROR_CODES.PROVIDER_ERROR.retryable).toBe(true);
      expect(ERROR_CODES.NETWORK_ERROR.retryable).toBe(true);
    });

    it("retryable is false for permanent errors", () => {
      expect(ERROR_CODES.UNAUTHORIZED.retryable).toBe(false);
      expect(ERROR_CODES.NOT_FOUND.retryable).toBe(false);
      expect(ERROR_CODES.INVALID_INPUT.retryable).toBe(false);
      expect(ERROR_CODES.QUOTA_EXCEEDED.retryable).toBe(false);
    });
  });

  describe("Error self-correction suggestions", () => {
    it("suggestions are actionable for model self-correction", () => {
      for (const [_code, info] of Object.entries(ERROR_CODES)) {
        const hasActionable = ACTIONABLE_PATTERNS.some((pattern) =>
          pattern.test(info.defaultSuggestion)
        );
        expect(hasActionable).toBe(true);
      }
    });
  });
});

describe("Tool Result Contract", () => {
  it("success result has data field", () => {
    const result: ToolExecutionResult<{ value: number }> = {
      success: true,
      data: { value: 42 },
    };

    expect(result.success).toBe(true);
    expect(result.data?.value).toBe(42);
  });

  it("failure result has error field", () => {
    const result: ToolExecutionResult<never> = {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Resource not found",
        retryable: false,
      },
    };

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("NOT_FOUND");
  });

  it("metadata is optional on both success and failure", () => {
    const successResult: ToolExecutionResult<string> = {
      success: true,
      data: "ok",
    };

    const failureResult: ToolExecutionResult<never> = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Error",
        retryable: true,
      },
    };

    expect(successResult.metadata).toBeUndefined();
    expect(failureResult.metadata).toBeUndefined();
  });
});
