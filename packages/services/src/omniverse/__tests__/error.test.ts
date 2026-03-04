import { describe, expect, it } from "bun:test";
import { OmniverseApiError } from "../types";

describe("OmniverseApiError", () => {
  it("constructs with required options", () => {
    const error = new OmniverseApiError({
      message: "Not found",
      code: "NOT_FOUND",
    });

    expect(error.message).toBe("Not found");
    expect(error.code).toBe("NOT_FOUND");
    expect(error.retryable).toBe(false);
    expect(error.retryAfter).toBeUndefined();
    expect(error.name).toBe("OmniverseApiError");
  });

  it("constructs with all options", () => {
    const error = new OmniverseApiError({
      message: "Rate limited",
      code: "RATE_LIMITED",
      retryable: true,
      retryAfter: 30,
    });

    expect(error.retryable).toBe(true);
    expect(error.retryAfter).toBe(30);
  });

  it("defaults retryable to false", () => {
    const error = new OmniverseApiError({
      message: "Error",
      code: "API_ERROR",
    });
    expect(error.retryable).toBe(false);
  });

  it("is instanceof Error", () => {
    const error = new OmniverseApiError({
      message: "Error",
      code: "API_ERROR",
    });
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(OmniverseApiError);
  });

  describe("isAuthError", () => {
    it("returns true for UNAUTHORIZED", () => {
      expect(OmniverseApiError.isAuthError("UNAUTHORIZED")).toBe(true);
    });

    it("returns true for FORBIDDEN", () => {
      expect(OmniverseApiError.isAuthError("FORBIDDEN")).toBe(true);
    });

    it("returns false for other codes", () => {
      expect(OmniverseApiError.isAuthError("RATE_LIMITED")).toBe(false);
    });
  });

  describe("isRateLimitError", () => {
    it("returns true for RATE_LIMITED", () => {
      expect(OmniverseApiError.isRateLimitError("RATE_LIMITED")).toBe(true);
    });

    it("returns false for other codes", () => {
      expect(OmniverseApiError.isRateLimitError("UNAUTHORIZED")).toBe(false);
    });
  });
});
