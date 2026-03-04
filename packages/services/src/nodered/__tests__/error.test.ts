import { describe, expect, it } from "bun:test";
import { NodeRedApiError } from "../types";

describe("NodeRedApiError", () => {
  it("sets message, code, retryable, and retryAfter from constructor", () => {
    const error = new NodeRedApiError({
      message: "Rate limit exceeded",
      code: "RATE_LIMITED",
      retryable: true,
      retryAfter: 45,
    });

    expect(error.message).toBe("Rate limit exceeded");
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.retryable).toBe(true);
    expect(error.retryAfter).toBe(45);
  });

  it("defaults retryable to false when not provided", () => {
    const error = new NodeRedApiError({
      message: "Unauthorized",
      code: "UNAUTHORIZED",
    });

    expect(error.retryable).toBe(false);
  });

  it("leaves retryAfter undefined when not provided", () => {
    const error = new NodeRedApiError({
      message: "Unauthorized",
      code: "UNAUTHORIZED",
    });

    expect(error.retryAfter).toBeUndefined();
  });

  it("is an instance of Error", () => {
    const error = new NodeRedApiError({
      message: "fail",
      code: "UNAUTHORIZED",
    });

    expect(error).toBeInstanceOf(Error);
  });

  it('has name "NodeRedApiError"', () => {
    const error = new NodeRedApiError({
      message: "fail",
      code: "UNAUTHORIZED",
    });

    expect(error.name).toBe("NodeRedApiError");
  });

  it('isAuthError returns true for "UNAUTHORIZED"', () => {
    expect(NodeRedApiError.isAuthError("UNAUTHORIZED")).toBe(true);
  });

  it('isAuthError returns true for "FORBIDDEN"', () => {
    expect(NodeRedApiError.isAuthError("FORBIDDEN")).toBe(true);
  });

  it('isAuthError returns false for "RATE_LIMITED"', () => {
    expect(NodeRedApiError.isAuthError("RATE_LIMITED")).toBe(false);
  });

  it('isRateLimitError returns true for "RATE_LIMITED"', () => {
    expect(NodeRedApiError.isRateLimitError("RATE_LIMITED")).toBe(true);
  });

  it('isRateLimitError returns false for "UNAUTHORIZED"', () => {
    expect(NodeRedApiError.isRateLimitError("UNAUTHORIZED")).toBe(false);
  });
});
