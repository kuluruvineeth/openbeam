import { describe, expect, it } from "bun:test";
import { BacnetApiError } from "../types";

describe("BacnetApiError", () => {
  it("sets message, code, retryable, deviceAddress, and deviceId from constructor", () => {
    const error = new BacnetApiError({
      message: "Device unreachable",
      code: "DEVICE_UNREACHABLE",
      retryable: true,
      deviceAddress: "192.168.1.100",
      deviceId: 42,
    });

    expect(error.message).toBe("Device unreachable");
    expect(error.code).toBe("DEVICE_UNREACHABLE");
    expect(error.retryable).toBe(true);
    expect(error.deviceAddress).toBe("192.168.1.100");
    expect(error.deviceId).toBe(42);
  });

  it("leaves deviceAddress undefined when not provided", () => {
    const error = new BacnetApiError({
      message: "Timeout",
      code: "TIMEOUT",
    });

    expect(error.deviceAddress).toBeUndefined();
  });

  it("leaves deviceId undefined when not provided", () => {
    const error = new BacnetApiError({
      message: "Timeout",
      code: "TIMEOUT",
    });

    expect(error.deviceId).toBeUndefined();
  });

  it("defaults retryable to false when not provided", () => {
    const error = new BacnetApiError({
      message: "Timeout",
      code: "TIMEOUT",
    });

    expect(error.retryable).toBe(false);
  });

  it("is an instance of Error", () => {
    const error = new BacnetApiError({
      message: "fail",
      code: "TIMEOUT",
    });

    expect(error).toBeInstanceOf(Error);
  });

  it('has name "BacnetApiError"', () => {
    const error = new BacnetApiError({
      message: "fail",
      code: "TIMEOUT",
    });

    expect(error.name).toBe("BacnetApiError");
  });

  it('isTimeoutError returns true for "TIMEOUT"', () => {
    expect(BacnetApiError.isTimeoutError("TIMEOUT")).toBe(true);
  });

  it('isTimeoutError returns false for "DEVICE_UNREACHABLE"', () => {
    expect(BacnetApiError.isTimeoutError("DEVICE_UNREACHABLE")).toBe(false);
  });

  it('isDeviceError returns true for "DEVICE_UNREACHABLE"', () => {
    expect(BacnetApiError.isDeviceError("DEVICE_UNREACHABLE")).toBe(true);
  });

  it('isDeviceError returns true for "READ_FAILED"', () => {
    expect(BacnetApiError.isDeviceError("READ_FAILED")).toBe(true);
  });

  it('isDeviceError returns false for "TIMEOUT"', () => {
    expect(BacnetApiError.isDeviceError("TIMEOUT")).toBe(false);
  });
});
