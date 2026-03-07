import { describe, expect, it } from "bun:test";
import {
  createNullSessionCodec,
  recordOrNull,
  safeDeserialize,
  safeGetDisplayId,
  safeSerialize,
  stringOrNull,
} from "../session-codec";

describe("createNullSessionCodec", () => {
  const codec = createNullSessionCodec();

  it("serialize returns null", () => {
    expect(codec.serialize({ foo: "bar" })).toBeNull();
  });

  it("deserialize returns null", () => {
    expect(codec.deserialize({ foo: "bar" })).toBeNull();
  });

  it("getDisplayId returns null", () => {
    expect(codec.getDisplayId?.({ id: "123" }) ?? null).toBeNull();
  });
});

describe("safeSerialize", () => {
  it("returns params when no codec", () => {
    const params = { key: "value" };
    expect(safeSerialize(undefined, params)).toBe(params);
  });

  it("delegates to codec.serialize", () => {
    const codec = {
      serialize: (p: Record<string, unknown>) => ({
        wrapped: p.key,
      }),
      deserialize: () => null,
    };
    expect(safeSerialize(codec, { key: "value" })).toEqual({
      wrapped: "value",
    });
  });
});

describe("safeDeserialize", () => {
  it("returns raw when no codec", () => {
    const raw = { key: "value" };
    expect(safeDeserialize(undefined, raw)).toBe(raw);
  });

  it("delegates to codec.deserialize", () => {
    const codec = {
      serialize: () => null,
      deserialize: (r: Record<string, unknown>) => ({
        unwrapped: r.key,
      }),
    };
    expect(safeDeserialize(codec, { key: "value" })).toEqual({
      unwrapped: "value",
    });
  });
});

describe("safeGetDisplayId", () => {
  it("returns null when no codec", () => {
    expect(safeGetDisplayId(undefined, { id: "x" })).toBeNull();
  });

  it("returns null when codec has no getDisplayId", () => {
    const codec = { serialize: () => null, deserialize: () => null };
    expect(safeGetDisplayId(codec, { id: "x" })).toBeNull();
  });

  it("delegates to codec.getDisplayId", () => {
    const codec = {
      serialize: () => null,
      deserialize: () => null,
      getDisplayId: (p: Record<string, unknown>) => String(p.id),
    };
    expect(safeGetDisplayId(codec, { id: "session-42" })).toBe("session-42");
  });
});

describe("stringOrNull", () => {
  it("returns string for non-empty string", () => {
    expect(stringOrNull("hello")).toBe("hello");
  });

  it("returns null for empty string", () => {
    expect(stringOrNull("")).toBeNull();
  });

  it("returns null for non-string values", () => {
    expect(stringOrNull(42)).toBeNull();
    expect(stringOrNull(null)).toBeNull();
    expect(stringOrNull(undefined)).toBeNull();
    expect(stringOrNull(true)).toBeNull();
  });
});

describe("recordOrNull", () => {
  it("returns object for plain object", () => {
    const obj = { key: "value" };
    expect(recordOrNull(obj)).toBe(obj);
  });

  it("returns null for array", () => {
    expect(recordOrNull([1, 2, 3])).toBeNull();
  });

  it("returns null for null", () => {
    expect(recordOrNull(null)).toBeNull();
  });

  it("returns null for primitives", () => {
    expect(recordOrNull("string")).toBeNull();
    expect(recordOrNull(42)).toBeNull();
    expect(recordOrNull(undefined)).toBeNull();
  });
});
