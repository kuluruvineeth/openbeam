import {
  encodingTypes,
  type Payload,
  type PayloadCodec,
} from "@temporalio/common";

export interface PIIRedactionConfig {
  keyId: string;
  rotationInterval: number;
}

export interface RedactionOptions {
  patterns: Set<
    | "EMAIL"
    | "PHONE"
    | "SSN"
    | "CREDIT_CARD"
    | "API_KEY"
    | "AWS_ACCESS_KEY"
    | "IP_ADDRESS"
    | "US_PASSPORT"
  >;
  sensitiveFields: Set<string>;
  strategy: "mask" | "remove" | "hash";
  maskChar?: string;
}

const PATTERNS = {
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  PHONE: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
  CREDIT_CARD: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  API_KEY: /\b(sk|pk)_(?:test|live)_[a-zA-Z0-9]{24,}\b|[a-zA-Z0-9]{32,}\b/g,
  AWS_ACCESS_KEY: /\b(?:AKIA|ASIA|AIDA)[A-Z0-9]{16}\b/g,
  IP_ADDRESS:
    /\b(?:\d{1,3}\.){3}\d{1,3}\b|([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
  US_PASSPORT: /\b[A-Z]{1,2}\d{6,9}\b/g,
};

export class PIIRedactionCodec implements PayloadCodec {
  private readonly options: RedactionOptions;

  private constructor(_config: PIIRedactionConfig, options: RedactionOptions) {
    this.options = options;
  }

  static create(
    config: PIIRedactionConfig,
    options: RedactionOptions
  ): PIIRedactionCodec {
    return new PIIRedactionCodec(config, options);
  }

  encode(payloads: Payload[]): Promise<Payload[]> {
    return Promise.all(payloads.map((payload) => this.encodePayload(payload)));
  }

  decode(payloads: Payload[]): Promise<Payload[]> {
    return Promise.resolve(payloads);
  }

  private encodePayload(payload: Payload): Payload {
    if (
      payload.metadata?.encoding?.toString() ===
      encodingTypes.METADATA_ENCODING_JSON
    ) {
      const data = JSON.parse(
        Buffer.from(payload.data ?? new Uint8Array()).toString("utf-8")
      );
      const redacted = this.redactObject(data);
      return {
        ...payload,
        data: new TextEncoder().encode(JSON.stringify(redacted)),
      };
    }
    return payload;
  }

  private redactObject(obj: unknown): unknown {
    if (typeof obj === "string") {
      return this.redactString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactObject(item));
    }

    if (obj !== null && typeof obj === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (this.options.sensitiveFields.has(key)) {
          result[key] = this.applyStrategy(String(value));
        } else {
          result[key] = this.redactObject(value);
        }
      }
      return result;
    }

    return obj;
  }

  private redactString(str: string): string {
    let result = str;
    for (const pattern of Array.from(this.options.patterns)) {
      if (PATTERNS[pattern]) {
        result = result.replace(PATTERNS[pattern], this.applyStrategy(str));
      }
    }
    return result;
  }

  private applyStrategy(value: string): string {
    switch (this.options.strategy) {
      case "mask":
        return (this.options.maskChar ?? "*").repeat(Math.min(value.length, 8));
      case "remove":
        return "[REDACTED]";
      case "hash":
        return `[HASH:${value.length}]`;
      default:
        return "[REDACTED]";
    }
  }
}
