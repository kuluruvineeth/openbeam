import { describe, expect, it } from "bun:test";
import { ThingsboardApiError } from "../types";

describe("ThingsboardApiError", () => {
  it("sets message, code, retryable, and retryAfter from constructor", () => {
    const error = new ThingsboardApiError({
      message: "Rate limit exceeded",
      code: "RATE_LIMITED",
      retryable: true,
      retryAfter: 60,
    });

    expect(error.message).toBe("Rate limit exceeded");
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.retryable).toBe(true);
    expect(error.retryAfter).toBe(60);
  });

  it("defaults retryable to false when not provided", () => {
    const error = new ThingsboardApiError({
      message: "Unauthorized",
      code: "UNAUTHORIZED",
    });

    expect(error.retryable).toBe(false);
  });

  it("is an instance of Error", () => {
    const error = new ThingsboardApiError({
      message: "fail",
      code: "UNAUTHORIZED",
    });

    expect(error).toBeInstanceOf(Error);
  });

  it('has name "ThingsboardApiError"', () => {
    const error = new ThingsboardApiError({
      message: "fail",
      code: "UNAUTHORIZED",
    });

    expect(error.name).toBe("ThingsboardApiError");
  });

  it('isAuthError returns true for "UNAUTHORIZED"', () => {
    expect(ThingsboardApiError.isAuthError("UNAUTHORIZED")).toBe(true);
  });

  it('isAuthError returns true for "FORBIDDEN"', () => {
    expect(ThingsboardApiError.isAuthError("FORBIDDEN")).toBe(true);
  });

  it('isAuthError returns false for "RATE_LIMITED"', () => {
    expect(ThingsboardApiError.isAuthError("RATE_LIMITED")).toBe(false);
  });

  it('isRateLimitError returns true for "RATE_LIMITED"', () => {
    expect(ThingsboardApiError.isRateLimitError("RATE_LIMITED")).toBe(true);
  });

  it('isRateLimitError returns false for "UNAUTHORIZED"', () => {
    expect(ThingsboardApiError.isRateLimitError("UNAUTHORIZED")).toBe(false);
  });
});
