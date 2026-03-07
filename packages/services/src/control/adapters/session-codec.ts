import type { AdapterSessionCodec } from "./types";

export function createNullSessionCodec(): AdapterSessionCodec {
  return {
    serialize: () => null,
    deserialize: () => null,
    getDisplayId: () => null,
  };
}

export function safeSerialize(
  codec: AdapterSessionCodec | undefined,
  params: Record<string, unknown>
): Record<string, unknown> | null {
  if (!codec) {
    return params;
  }
  return codec.serialize(params);
}

export function safeDeserialize(
  codec: AdapterSessionCodec | undefined,
  raw: Record<string, unknown>
): Record<string, unknown> | null {
  if (!codec) {
    return raw;
  }
  return codec.deserialize(raw);
}

export function safeGetDisplayId(
  codec: AdapterSessionCodec | undefined,
  params: Record<string, unknown>
): string | null {
  if (!codec?.getDisplayId) {
    return null;
  }
  return codec.getDisplayId(params);
}

export function stringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return null;
}

export function recordOrNull(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}
