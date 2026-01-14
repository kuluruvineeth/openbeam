import { describe, expect, it } from "bun:test";
import {
  ConnectorError,
  ConnectorErrorCode,
  getRetryDelayMs,
  isRetryableError,
  normalizeApiError,
} from "../errors";

describe("ConnectorErrorCode", () => {
  it("includes all expected error codes", () => {
    const codes = ConnectorErrorCode.options;

    expect(codes).toContain("AUTH_EXPIRED");
    expect(codes).toContain("AUTH_INVALID");
    expect(codes).toContain("RATE_LIMITED");
    expect(codes).toContain("API_ERROR");
    expect(codes).toContain("NETWORK_ERROR");
    expect(codes).toContain("NOT_FOUND");
    expect(codes).toContain("PERMISSION_DENIED");
    expect(codes).toContain("SYNC_CONFLICT");
    expect(codes).toContain("INVALID_CURSOR");
    expect(codes).toContain("WEBHOOK_INVALID");
    expect(codes).toContain("CONFIG_ERROR");
  });
});

describe("ConnectorError", () => {
  describe("constructor", () => {
    it("creates error with required fields", () => {
      const error = new ConnectorError("API_ERROR", "Something went wrong");

      expect(error.code).toBe("API_ERROR");
      expect(error.message).toBe("Something went wrong");
      expect(error.name).toBe("ConnectorError");
    });

    it("sets retryable based on error code", () => {
      const retryable = new ConnectorError("RATE_LIMITED", "Too many requests");
      const nonRetryable = new ConnectorError("AUTH_EXPIRED", "Token expired");

      expect(retryable.retryable).toBe(true);
      expect(nonRetryable.retryable).toBe(false);
    });

    it("accepts optional fields", () => {
      const cause = new Error("Original error");
      const error = new ConnectorError("API_ERROR", "Failed", {
        retryAfterMs: 5000,
        connectorId: "conn_123",
        cause,
        metadata: { requestId: "req_456" },
      });

      expect(error.retryAfterMs).toBe(5000);
      expect(error.connectorId).toBe("conn_123");
      expect(error.cause).toBe(cause);
      expect(error.metadata).toEqual({ requestId: "req_456" });
    });
  });

  describe("retryable error codes", () => {
    it("RATE_LIMITED is retryable", () => {
      const error = new ConnectorError("RATE_LIMITED", "Rate limited");
      expect(error.retryable).toBe(true);
    });

    it("NETWORK_ERROR is retryable", () => {
      const error = new ConnectorError("NETWORK_ERROR", "Connection failed");
      expect(error.retryable).toBe(true);
    });

    it("API_ERROR is retryable", () => {
      const error = new ConnectorError("API_ERROR", "Server error");
      expect(error.retryable).toBe(true);
    });

    it("AUTH_EXPIRED is not retryable", () => {
      const error = new ConnectorError("AUTH_EXPIRED", "Token expired");
      expect(error.retryable).toBe(false);
    });

    it("NOT_FOUND is not retryable", () => {
      const error = new ConnectorError("NOT_FOUND", "Resource missing");
      expect(error.retryable).toBe(false);
    });

    it("PERMISSION_DENIED is not retryable", () => {
      const error = new ConnectorError("PERMISSION_DENIED", "Access denied");
      expect(error.retryable).toBe(false);
    });
  });

  describe("static factory methods", () => {
    it("authExpired creates AUTH_EXPIRED error", () => {
      const error = ConnectorError.authExpired();

      expect(error.code).toBe("AUTH_EXPIRED");
      expect(error.message).toBe("Authentication expired");
      expect(error.retryable).toBe(false);
    });

    it("authExpired accepts custom message", () => {
      const error = ConnectorError.authExpired("OAuth token invalid", {
        connectorId: "conn_123",
      });

      expect(error.message).toBe("OAuth token invalid");
      expect(error.connectorId).toBe("conn_123");
    });

    it("rateLimited creates RATE_LIMITED error", () => {
      const error = ConnectorError.rateLimited(60_000);

      expect(error.code).toBe("RATE_LIMITED");
      expect(error.message).toBe("Rate limit exceeded");
      expect(error.retryable).toBe(true);
      expect(error.retryAfterMs).toBe(60_000);
    });

    it("rateLimited without retryAfterMs", () => {
      const error = ConnectorError.rateLimited();

      expect(error.code).toBe("RATE_LIMITED");
      expect(error.retryAfterMs).toBeUndefined();
    });

    it("notFound creates NOT_FOUND error", () => {
      const error = ConnectorError.notFound("document");

      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).toBe("Resource not found: document");
      expect(error.retryable).toBe(false);
    });

    it("permissionDenied creates PERMISSION_DENIED error", () => {
      const error = ConnectorError.permissionDenied();

      expect(error.code).toBe("PERMISSION_DENIED");
      expect(error.message).toBe("Permission denied");
      expect(error.retryable).toBe(false);
    });

    it("apiError creates API_ERROR error", () => {
      const error = ConnectorError.apiError("Internal server error");

      expect(error.code).toBe("API_ERROR");
      expect(error.message).toBe("Internal server error");
      expect(error.retryable).toBe(true);
    });
  });

  describe("toJSON", () => {
    it("serializes all fields", () => {
      const error = new ConnectorError("API_ERROR", "Failed", {
        retryAfterMs: 5000,
        connectorId: "conn_123",
        metadata: { key: "value" },
      });

      const json = error.toJSON();

      expect(json).toEqual({
        name: "ConnectorError",
        code: "API_ERROR",
        message: "Failed",
        retryable: true,
        retryAfterMs: 5000,
        connectorId: "conn_123",
        metadata: { key: "value" },
      });
    });

    it("handles undefined optional fields", () => {
      const error = new ConnectorError("NOT_FOUND", "Missing");
      const json = error.toJSON();

      expect(json.retryAfterMs).toBeUndefined();
      expect(json.connectorId).toBeUndefined();
      expect(json.metadata).toBeUndefined();
    });
  });
});

describe("normalizeApiError", () => {
  it("returns ConnectorError unchanged", () => {
    const original = ConnectorError.apiError("Already normalized");
    const result = normalizeApiError(original);

    expect(result).toBe(original);
  });

  it("classifies 401 as AUTH_EXPIRED", () => {
    const error = new Error("Request failed with status 401");
    const result = normalizeApiError(error);

    expect(result.code).toBe("AUTH_EXPIRED");
  });

  it("classifies unauthorized as AUTH_EXPIRED", () => {
    const error = new Error("unauthorized access");
    const result = normalizeApiError(error);

    expect(result.code).toBe("AUTH_EXPIRED");
  });

  it("classifies 403 as PERMISSION_DENIED", () => {
    const error = new Error("Request failed with status 403");
    const result = normalizeApiError(error);

    expect(result.code).toBe("PERMISSION_DENIED");
  });

  it("classifies forbidden as PERMISSION_DENIED", () => {
    const error = new Error("forbidden resource");
    const result = normalizeApiError(error);

    expect(result.code).toBe("PERMISSION_DENIED");
  });

  it("classifies 429 as RATE_LIMITED", () => {
    const error = new Error("Request failed with status 429");
    const result = normalizeApiError(error);

    expect(result.code).toBe("RATE_LIMITED");
    expect(result.retryable).toBe(true);
  });

  it("classifies rate as RATE_LIMITED", () => {
    const error = new Error("rate limit exceeded");
    const result = normalizeApiError(error);

    expect(result.code).toBe("RATE_LIMITED");
  });

  it("extracts retry-after from message", () => {
    const error = new Error("Rate limited. Retry-After: 60");
    const result = normalizeApiError(error);

    expect(result.code).toBe("RATE_LIMITED");
    expect(result.retryAfterMs).toBe(60_000);
  });

  it("classifies 404 as NOT_FOUND", () => {
    const error = new Error("Request failed with status 404");
    const result = normalizeApiError(error);

    expect(result.code).toBe("NOT_FOUND");
  });

  it("classifies not found as NOT_FOUND", () => {
    const error = new Error("resource not found");
    const result = normalizeApiError(error);

    expect(result.code).toBe("NOT_FOUND");
  });

  it("classifies timeout as NETWORK_ERROR", () => {
    const error = new Error("Request timeout");
    const result = normalizeApiError(error);

    expect(result.code).toBe("NETWORK_ERROR");
    expect(result.retryable).toBe(true);
  });

  it("classifies etimedout as NETWORK_ERROR", () => {
    const error = new Error("connect ETIMEDOUT");
    const result = normalizeApiError(error);

    expect(result.code).toBe("NETWORK_ERROR");
  });

  it("classifies econnrefused as NETWORK_ERROR", () => {
    const error = new Error("connect ECONNREFUSED");
    const result = normalizeApiError(error);

    expect(result.code).toBe("NETWORK_ERROR");
  });

  it("classifies econnreset as NETWORK_ERROR", () => {
    const error = new Error("read ECONNRESET");
    const result = normalizeApiError(error);

    expect(result.code).toBe("NETWORK_ERROR");
  });

  it("defaults to API_ERROR for unknown errors", () => {
    const error = new Error("Something unexpected happened");
    const result = normalizeApiError(error);

    expect(result.code).toBe("API_ERROR");
    expect(result.message).toBe("Something unexpected happened");
    expect(result.retryable).toBe(true);
  });

  it("handles non-Error objects", () => {
    const result = normalizeApiError("string error");

    expect(result.code).toBe("API_ERROR");
    expect(result.message).toBe("Unknown API error");
  });

  it("handles null/undefined", () => {
    const resultNull = normalizeApiError(null);
    const resultUndefined = normalizeApiError(undefined);

    expect(resultNull.code).toBe("API_ERROR");
    expect(resultUndefined.code).toBe("API_ERROR");
  });

  it("preserves connectorId", () => {
    const error = new Error("Failed");
    const result = normalizeApiError(error, "conn_123");

    expect(result.connectorId).toBe("conn_123");
  });

  it("preserves original error as cause", () => {
    const original = new Error("Original");
    const result = normalizeApiError(original);

    expect(result.cause).toBe(original);
  });
});

describe("isRetryableError", () => {
  it("returns true for retryable ConnectorError", () => {
    const error = ConnectorError.rateLimited();
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns false for non-retryable ConnectorError", () => {
    const error = ConnectorError.authExpired();
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns false for regular Error", () => {
    const error = new Error("Regular error");
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns false for non-Error types", () => {
    expect(isRetryableError("string")).toBe(false);
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
    expect(isRetryableError({})).toBe(false);
  });
});

describe("getRetryDelayMs", () => {
  it("returns retryAfterMs from ConnectorError", () => {
    const error = ConnectorError.rateLimited(30_000);
    expect(getRetryDelayMs(error)).toBe(30_000);
  });

  it("returns default when retryAfterMs is undefined", () => {
    const error = ConnectorError.rateLimited();
    expect(getRetryDelayMs(error)).toBe(5000);
  });

  it("returns custom default", () => {
    const error = ConnectorError.rateLimited();
    expect(getRetryDelayMs(error, 10_000)).toBe(10_000);
  });

  it("returns default for non-ConnectorError", () => {
    const error = new Error("Regular");
    expect(getRetryDelayMs(error)).toBe(5000);
  });

  it("returns default for non-Error types", () => {
    expect(getRetryDelayMs("string")).toBe(5000);
    expect(getRetryDelayMs(null)).toBe(5000);
  });
});
