import {
  encodingTypes,
  type Payload,
  type PayloadCodec,
} from "@temporalio/common";

const SENSITIVE_FIELDS = new Set([
  "accessToken",
  "refreshToken",
  "apiKey",
  "apiKeyValue",
  "password",
  "secret",
  "credentials",
  "token",
  "privateKey",
  "clientSecret",
  "bearerToken",
  "authToken",
  "sessionToken",
  "oauthToken",
  "encryptionKey",
  "signingKey",
  "webhookSecret",
  "oauth2ClientSecret",
  "customHeaderValue",
  "environment",
]);

const REDACTED_VALUE = "[REDACTED]";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function redactSensitiveFields(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(redactSensitiveFields);
  }

  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, fieldValue] of Object.entries(value)) {
      if (SENSITIVE_FIELDS.has(key)) {
        result[key] = REDACTED_VALUE;
      } else {
        result[key] = redactSensitiveFields(fieldValue);
      }
    }
    return result;
  }

  return value;
}

export class RedactingPayloadCodec implements PayloadCodec {
  encode(payloads: Payload[]): Promise<Payload[]> {
    return Promise.resolve(
      payloads.map((payload) => this.encodePayload(payload))
    );
  }

  decode(payloads: Payload[]): Promise<Payload[]> {
    return Promise.resolve(payloads);
  }

  private encodePayload(payload: Payload): Payload {
    const encoding = payload.metadata?.encoding?.toString();
    if (encoding !== encodingTypes.METADATA_ENCODING_JSON) {
      return payload;
    }

    const dataBuffer = payload.data ?? new Uint8Array();
    const data = JSON.parse(Buffer.from(dataBuffer).toString("utf-8"));
    const redacted = redactSensitiveFields(data);

    return {
      ...payload,
      data: new TextEncoder().encode(JSON.stringify(redacted)),
    };
  }
}

export function createRedactingPayloadCodec(): PayloadCodec {
  return new RedactingPayloadCodec();
}
