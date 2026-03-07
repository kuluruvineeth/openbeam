import type {
  RetryNodeConfig,
  TryCatchNodeConfig,
} from "@openbeam/types/canvas";
import { ApplicationFailure } from "@temporalio/common";
import { describe, expect, it } from "vitest";
import {
  CANVAS_ERROR_TYPES,
  createExecutionPlanError,
  createValidationError,
  formatPlanError,
  isNonRetryableError,
  ParallelMapTaskError,
  resolveFailureDetails,
  resolveFailureMessage,
  shouldCatchFailure,
  shouldRetryFailure,
  unwrapFailure,
} from "../utils/errors";

describe("unwrapFailure", () => {
  it("returns the error when no cause", () => {
    const error = new Error("Test error");

    const result = unwrapFailure(error);

    expect(result).toBe(error);
  });

  it("unwraps nested cause chain", () => {
    const root = new Error("Root cause");
    const middle = new Error("Middle", { cause: root });
    const outer = new Error("Outer", { cause: middle });

    const result = unwrapFailure(outer);

    expect(result).toBe(root);
  });

  it("handles non-error values", () => {
    expect(unwrapFailure("string error")).toBe("string error");
    expect(unwrapFailure(123)).toBe(123);
    expect(unwrapFailure(null)).toBe(null);
  });

  it("handles circular cause references", () => {
    const error: Error & { cause?: unknown } = new Error("Test");
    error.cause = error;

    const result = unwrapFailure(error);

    expect(result).toBe(error);
  });
});

describe("resolveFailureMessage", () => {
  it("returns message from unwrapped error", () => {
    const root = new Error("Root message");
    const outer = new Error("Outer message", { cause: root });

    const result = resolveFailureMessage(outer);

    expect(result).toBe("Root message");
  });

  it("returns message from direct error", () => {
    const error = new Error("Direct message");

    const result = resolveFailureMessage(error);

    expect(result).toBe("Direct message");
  });

  it("converts non-error to string", () => {
    const result = resolveFailureMessage("string error");

    expect(result).toBe("string error");
  });
});

describe("resolveFailureDetails", () => {
  it("extracts details from ApplicationFailure", () => {
    const failure = ApplicationFailure.nonRetryable("Test", "TestError");

    const result = resolveFailureDetails(failure);

    expect(result.type).toBe("TestError");
    expect(result.nonRetryable).toBe(true);
  });

  it("extracts details from nested ApplicationFailure", () => {
    const root = ApplicationFailure.nonRetryable("Root", "RootError");
    const outer = new Error("Outer", { cause: root });

    const result = resolveFailureDetails(outer);

    expect(result.type).toBe("RootError");
    expect(result.nonRetryable).toBe(true);
  });

  it("extracts name from regular Error", () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = "CustomError";
      }
    }
    const error = new CustomError("Test");

    const result = resolveFailureDetails(error);

    expect(result.name).toBe("CustomError");
  });

  it("returns empty object for non-error", () => {
    const result = resolveFailureDetails("string error");

    expect(result).toEqual({});
  });
});

describe("formatPlanError", () => {
  it("formats regular error message", () => {
    const error = new Error("Something went wrong");

    const result = formatPlanError(error);

    expect(result).toBe("Something went wrong");
  });

  it("converts non-error to string", () => {
    const result = formatPlanError("string error");

    expect(result).toBe("string error");
  });
});

describe("shouldRetryFailure", () => {
  const baseConfig: RetryNodeConfig = {
    maxAttempts: 3,
    backoffMs: 1000,
    exponential: false,
  };

  it("returns false for unsupported node type error", () => {
    const error = ApplicationFailure.nonRetryable(
      "Test",
      CANVAS_ERROR_TYPES.UNSUPPORTED_NODE
    );

    const result = shouldRetryFailure(error, baseConfig);

    expect(result).toBe(false);
  });

  it("returns false for execution plan error", () => {
    const error = ApplicationFailure.nonRetryable(
      "Test",
      CANVAS_ERROR_TYPES.EXECUTION_PLAN
    );

    const result = shouldRetryFailure(error, baseConfig);

    expect(result).toBe(false);
  });

  it("returns true when error type in allowlist", () => {
    const config: RetryNodeConfig = {
      ...baseConfig,
      retryOnErrors: ["NetworkError", "TimeoutError"],
    };
    const error = ApplicationFailure.retryable("Timeout", "TimeoutError");

    const result = shouldRetryFailure(error, config);

    expect(result).toBe(true);
  });

  it("returns false when error type not in allowlist", () => {
    const config: RetryNodeConfig = {
      ...baseConfig,
      retryOnErrors: ["NetworkError"],
    };
    const error = ApplicationFailure.retryable("Auth failed", "AuthError");

    const result = shouldRetryFailure(error, config);

    expect(result).toBe(false);
  });

  it("returns false for non-retryable error without allowlist", () => {
    const error = ApplicationFailure.nonRetryable("Fatal", "FatalError");

    const result = shouldRetryFailure(error, baseConfig);

    expect(result).toBe(false);
  });

  it("returns true for retryable error without allowlist", () => {
    const error = ApplicationFailure.retryable("Transient", "TransientError");

    const result = shouldRetryFailure(error, baseConfig);

    expect(result).toBe(true);
  });

  it("returns true for node execution error even if non-retryable", () => {
    const error = ApplicationFailure.nonRetryable(
      "Test",
      CANVAS_ERROR_TYPES.NODE_EXECUTION
    );

    const result = shouldRetryFailure(error, baseConfig);

    expect(result).toBe(true);
  });

  it("returns true when error name matches allowlist", () => {
    const config: RetryNodeConfig = {
      ...baseConfig,
      retryOnErrors: ["CustomError"],
    };
    class CustomError extends Error {
      constructor() {
        super("Custom");
        this.name = "CustomError";
      }
    }

    const result = shouldRetryFailure(new CustomError(), config);

    expect(result).toBe(true);
  });
});

describe("shouldCatchFailure", () => {
  const baseConfig: TryCatchNodeConfig = {
    rethrowUnhandled: true,
    logErrors: false,
  };

  it("returns true when error type in allowlist", () => {
    const config: TryCatchNodeConfig = {
      ...baseConfig,
      catchErrors: ["ExpectedError"],
    };
    const error = ApplicationFailure.nonRetryable("Test", "ExpectedError");

    const result = shouldCatchFailure(error, config);

    expect(result).toBe(true);
  });

  it("returns false when error not in allowlist and rethrow enabled", () => {
    const config: TryCatchNodeConfig = {
      ...baseConfig,
      catchErrors: ["ExpectedError"],
      rethrowUnhandled: true,
    };
    const error = ApplicationFailure.nonRetryable("Test", "UnexpectedError");

    const result = shouldCatchFailure(error, config);

    expect(result).toBe(false);
  });

  it("returns true when error not in allowlist but rethrow disabled", () => {
    const config: TryCatchNodeConfig = {
      ...baseConfig,
      catchErrors: ["ExpectedError"],
      rethrowUnhandled: false,
    };
    const error = ApplicationFailure.nonRetryable("Test", "UnexpectedError");

    const result = shouldCatchFailure(error, config);

    expect(result).toBe(true);
  });

  it("returns true when no allowlist configured", () => {
    const result = shouldCatchFailure(new Error("Any error"), baseConfig);

    expect(result).toBe(true);
  });

  it("returns true when allowlist is empty array", () => {
    const config: TryCatchNodeConfig = {
      ...baseConfig,
      catchErrors: [],
    };

    const result = shouldCatchFailure(new Error("Any error"), config);

    expect(result).toBe(true);
  });

  it("ignores whitespace-only entries in allowlist", () => {
    const config: TryCatchNodeConfig = {
      ...baseConfig,
      catchErrors: ["  ", "ExpectedError"],
    };
    const error = ApplicationFailure.nonRetryable("Test", "ExpectedError");

    const result = shouldCatchFailure(error, config);

    expect(result).toBe(true);
  });
});

describe("ParallelMapTaskError", () => {
  it("creates error with details", () => {
    const details = {
      error: new Error("Task failed"),
      item: { id: 1 },
      index: 2,
      input: { data: "test" },
      startedAt: 1000,
    };

    const error = new ParallelMapTaskError(details);

    expect(error.name).toBe("ParallelMapTaskError");
    expect(error.message).toBe("Task failed");
    expect(error.details).toBe(details);
  });

  it("extracts message from nested error", () => {
    const root = new Error("Root cause");
    const wrapper = new Error("Wrapper", { cause: root });
    const details = {
      error: wrapper,
      item: { id: 1 },
      index: 0,
      input: {},
      startedAt: 1000,
    };

    const error = new ParallelMapTaskError(details);

    expect(error.message).toBe("Root cause");
  });
});

describe("isNonRetryableError", () => {
  it("returns true for non-retryable ApplicationFailure", () => {
    const error = ApplicationFailure.nonRetryable("Test", "TestError");

    expect(isNonRetryableError(error)).toBe(true);
  });

  it("returns false for retryable ApplicationFailure", () => {
    const error = ApplicationFailure.retryable("Test", "TestError");

    expect(isNonRetryableError(error)).toBe(false);
  });

  it("returns false for regular Error", () => {
    const error = new Error("Test");

    expect(isNonRetryableError(error)).toBe(false);
  });
});

describe("createExecutionPlanError", () => {
  it("creates non-retryable ApplicationFailure", () => {
    const error = createExecutionPlanError("Invalid plan");

    expect(error).toBeInstanceOf(ApplicationFailure);
    expect(error.type).toBe(CANVAS_ERROR_TYPES.EXECUTION_PLAN);
    expect(error.nonRetryable).toBe(true);
  });
});

describe("createValidationError", () => {
  it("creates non-retryable ApplicationFailure", () => {
    const error = createValidationError("Validation failed");

    expect(error).toBeInstanceOf(ApplicationFailure);
    expect(error.type).toBe(CANVAS_ERROR_TYPES.VALIDATION);
    expect(error.nonRetryable).toBe(true);
  });
});
