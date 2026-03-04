import { describe, expect, it } from "bun:test";
import { FhirApiError } from "../types";

describe("FhirApiError", () => {
  it("constructs with required options", () => {
    const error = new FhirApiError({
      message: "Not found",
      code: "NOT_FOUND",
    });

    expect(error.message).toBe("Not found");
    expect(error.code).toBe("NOT_FOUND");
    expect(error.retryable).toBe(false);
    expect(error.retryAfter).toBeUndefined();
    expect(error.name).toBe("FhirApiError");
  });

  it("constructs with all options", () => {
    const error = new FhirApiError({
      message: "Rate limited",
      code: "RATE_LIMITED",
      retryable: true,
      retryAfter: 30,
    });

    expect(error.retryable).toBe(true);
    expect(error.retryAfter).toBe(30);
  });

  it("defaults retryable to false", () => {
    const error = new FhirApiError({
      message: "Error",
      code: "API_ERROR",
    });
    expect(error.retryable).toBe(false);
  });

  it("is instanceof Error", () => {
    const error = new FhirApiError({
      message: "Error",
      code: "API_ERROR",
    });
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(FhirApiError);
  });

  describe("isAuthError", () => {
    it("returns true for UNAUTHORIZED", () => {
      expect(FhirApiError.isAuthError("UNAUTHORIZED")).toBe(true);
    });

    it("returns true for FORBIDDEN", () => {
      expect(FhirApiError.isAuthError("FORBIDDEN")).toBe(true);
    });

    it("returns false for other codes", () => {
      expect(FhirApiError.isAuthError("RATE_LIMITED")).toBe(false);
    });
  });

  describe("isRateLimitError", () => {
    it("returns true for RATE_LIMITED", () => {
      expect(FhirApiError.isRateLimitError("RATE_LIMITED")).toBe(true);
    });

    it("returns false for other codes", () => {
      expect(FhirApiError.isRateLimitError("UNAUTHORIZED")).toBe(false);
    });
  });
});
