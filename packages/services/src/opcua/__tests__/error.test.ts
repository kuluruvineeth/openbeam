import { describe, expect, it } from "bun:test";
import { OpcUaApiError } from "../types";

describe("OpcUaApiError", () => {
  it("sets message, code, retryable, and nodeId from constructor", () => {
    const error = new OpcUaApiError({
      message: "Read failed on node",
      code: "READ_ERROR",
      retryable: true,
      nodeId: "ns=2;s=Temperature",
    });

    expect(error.message).toBe("Read failed on node");
    expect(error.code).toBe("READ_ERROR");
    expect(error.retryable).toBe(true);
    expect(error.nodeId).toBe("ns=2;s=Temperature");
  });

  it("leaves nodeId undefined when not provided", () => {
    const error = new OpcUaApiError({
      message: "Connection failed",
      code: "CONNECTION_FAILED",
    });

    expect(error.nodeId).toBeUndefined();
  });

  it("defaults retryable to false when not provided", () => {
    const error = new OpcUaApiError({
      message: "Connection failed",
      code: "CONNECTION_FAILED",
    });

    expect(error.retryable).toBe(false);
  });

  it("is an instance of Error", () => {
    const error = new OpcUaApiError({
      message: "fail",
      code: "TIMEOUT",
    });

    expect(error).toBeInstanceOf(Error);
  });

  it('has name "OpcUaApiError"', () => {
    const error = new OpcUaApiError({
      message: "fail",
      code: "TIMEOUT",
    });

    expect(error.name).toBe("OpcUaApiError");
  });

  it('isConnectionError returns true for "CONNECTION_FAILED"', () => {
    expect(OpcUaApiError.isConnectionError("CONNECTION_FAILED")).toBe(true);
  });

  it('isConnectionError returns true for "SESSION_EXPIRED"', () => {
    expect(OpcUaApiError.isConnectionError("SESSION_EXPIRED")).toBe(true);
  });

  it('isConnectionError returns false for "READ_ERROR"', () => {
    expect(OpcUaApiError.isConnectionError("READ_ERROR")).toBe(false);
  });

  it('isRetryable returns true for "TIMEOUT"', () => {
    expect(OpcUaApiError.isRetryable("TIMEOUT")).toBe(true);
  });

  it('isRetryable returns true for "SESSION_EXPIRED"', () => {
    expect(OpcUaApiError.isRetryable("SESSION_EXPIRED")).toBe(true);
  });

  it('isRetryable returns false for "BROWSE_ERROR"', () => {
    expect(OpcUaApiError.isRetryable("BROWSE_ERROR")).toBe(false);
  });
});
