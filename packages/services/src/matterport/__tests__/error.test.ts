import { describe, expect, it } from "bun:test";
import { MatterportApiError } from "../types";

describe("MatterportApiError", () => {
  it("constructs with required options", () => {
    const error = new MatterportApiError({
      message: "Not found",
      code: "NOT_FOUND",
    });

    expect(error.message).toBe("Not found");
    expect(error.code).toBe("NOT_FOUND");
    expect(error.retryable).toBe(false);
    expect(error.retryAfter).toBeUndefined();
    expect(error.name).toBe("MatterportApiError");
  });

  it("constructs with all options", () => {
    const error = new MatterportApiError({
      message: "Rate limited",
      code: "RATE_LIMITED",
      retryable: true,
      retryAfter: 30,
    });

    expect(error.retryable).toBe(true);
    expect(error.retryAfter).toBe(30);
  });

  it("defaults retryable to false", () => {
    const error = new MatterportApiError({
      message: "Error",
      code: "API_ERROR",
    });

    expect(error.retryable).toBe(false);
  });

  it("is instanceof Error", () => {
    const error = new MatterportApiError({
      message: "Error",
      code: "API_ERROR",
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(MatterportApiError);
  });

  describe("isAuthError", () => {
    it("returns true for UNAUTHORIZED", () => {
      expect(MatterportApiError.isAuthError("UNAUTHORIZED")).toBe(true);
    });

    it("returns true for FORBIDDEN", () => {
      expect(MatterportApiError.isAuthError("FORBIDDEN")).toBe(true);
    });

    it("returns false for other codes", () => {
      expect(MatterportApiError.isAuthError("RATE_LIMITED")).toBe(false);
      expect(MatterportApiError.isAuthError("NOT_FOUND")).toBe(false);
    });
  });

  describe("isRateLimitError", () => {
    it("returns true for RATE_LIMITED", () => {
      expect(MatterportApiError.isRateLimitError("RATE_LIMITED")).toBe(true);
    });

    it("returns false for other codes", () => {
      expect(MatterportApiError.isRateLimitError("UNAUTHORIZED")).toBe(false);
    });
  });
});
