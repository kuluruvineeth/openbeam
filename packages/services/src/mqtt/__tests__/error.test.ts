import { describe, expect, it } from "bun:test";
import { MqttConnectorError } from "../types";

describe("MqttConnectorError", () => {
  it("sets message, code, retryable, and retryAfter from constructor", () => {
    const error = new MqttConnectorError({
      message: "Connection refused",
      code: "CONNECTION_FAILED",
      retryable: true,
      retryAfter: 30,
    });

    expect(error.message).toBe("Connection refused");
    expect(error.code).toBe("CONNECTION_FAILED");
    expect(error.retryable).toBe(true);
    expect(error.retryAfter).toBe(30);
  });

  it("defaults retryable to false when not provided", () => {
    const error = new MqttConnectorError({
      message: "Broker unavailable",
      code: "CONNECTION_FAILED",
    });

    expect(error.retryable).toBe(false);
  });

  it("leaves retryAfter undefined when not provided", () => {
    const error = new MqttConnectorError({
      message: "Broker unavailable",
      code: "CONNECTION_FAILED",
    });

    expect(error.retryAfter).toBeUndefined();
  });

  it("is an instance of Error", () => {
    const error = new MqttConnectorError({
      message: "fail",
      code: "CONNECTION_FAILED",
    });

    expect(error).toBeInstanceOf(Error);
  });

  it('has name "MqttConnectorError"', () => {
    const error = new MqttConnectorError({
      message: "fail",
      code: "CONNECTION_FAILED",
    });

    expect(error.name).toBe("MqttConnectorError");
  });

  it('isConnectionError returns true for "CONNECTION_FAILED"', () => {
    expect(MqttConnectorError.isConnectionError("CONNECTION_FAILED")).toBe(
      true
    );
  });

  it('isConnectionError returns true for "CONNECTION_LOST"', () => {
    expect(MqttConnectorError.isConnectionError("CONNECTION_LOST")).toBe(true);
  });

  it('isConnectionError returns false for "UNAUTHORIZED"', () => {
    expect(MqttConnectorError.isConnectionError("UNAUTHORIZED")).toBe(false);
  });

  it('isAuthError returns true for "UNAUTHORIZED"', () => {
    expect(MqttConnectorError.isAuthError("UNAUTHORIZED")).toBe(true);
  });

  it('isAuthError returns true for "FORBIDDEN"', () => {
    expect(MqttConnectorError.isAuthError("FORBIDDEN")).toBe(true);
  });

  it('isAuthError returns false for "CONNECTION_FAILED"', () => {
    expect(MqttConnectorError.isAuthError("CONNECTION_FAILED")).toBe(false);
  });
});
