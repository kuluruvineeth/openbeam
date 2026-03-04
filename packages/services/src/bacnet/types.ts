export type BacnetErrorCode =
  | "COV_SUBSCRIBE_FAILED"
  | "DEVICE_UNREACHABLE"
  | "DISCOVERY_FAILED"
  | "READ_FAILED"
  | "TIMEOUT";

interface BacnetApiErrorOptions {
  message: string;
  code: BacnetErrorCode;
  retryable?: boolean;
  deviceAddress?: string;
  deviceId?: number;
}

export class BacnetApiError extends Error {
  readonly code: BacnetErrorCode;
  readonly retryable: boolean;
  readonly deviceAddress?: string;
  readonly deviceId?: number;

  constructor(options: BacnetApiErrorOptions) {
    super(options.message);
    this.name = "BacnetApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.deviceAddress = options.deviceAddress;
    this.deviceId = options.deviceId;
  }

  static isTimeoutError(code: string): boolean {
    return code === "TIMEOUT";
  }

  static isDeviceError(code: string): boolean {
    return code === "DEVICE_UNREACHABLE" || code === "READ_FAILED";
  }
}
