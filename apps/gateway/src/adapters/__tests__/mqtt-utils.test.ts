import { describe, expect, it } from "bun:test";
import { matchesTopic, safeParsePayload } from "../mqtt-utils";

describe("matchesTopic", () => {
  it("returns true for exact match", () => {
    expect(matchesTopic("factory/line1/temp", "factory/line1/temp")).toBe(true);
  });

  it("returns false when a segment differs", () => {
    expect(matchesTopic("factory/line1/temp", "factory/line2/temp")).toBe(
      false
    );
  });

  it("matches any topic with bare #", () => {
    expect(matchesTopic("#", "any/topic/here")).toBe(true);
  });

  it("matches topics under a prefix with trailing #", () => {
    expect(matchesTopic("factory/#", "factory/line1/temp")).toBe(true);
  });

  it("matches deep topics under a prefix with trailing #", () => {
    expect(matchesTopic("factory/#", "factory/line1/cell/temp")).toBe(true);
  });

  it("matches single-level wildcard +", () => {
    expect(matchesTopic("factory/+/temp", "factory/line1/temp")).toBe(true);
  });

  it("rejects + when topic has extra levels", () => {
    expect(matchesTopic("factory/+/temp", "factory/line1/cell/temp")).toBe(
      false
    );
  });

  it("matches multiple + wildcards", () => {
    expect(matchesTopic("+/+/temp", "factory/line1/temp")).toBe(true);
  });

  it("matches mixed + and # wildcards", () => {
    expect(matchesTopic("factory/+/#", "factory/line1/temp/value")).toBe(true);
  });

  it("returns false when pattern is longer than topic", () => {
    expect(matchesTopic("a/b/c", "a/b")).toBe(false);
  });

  it("returns false when topic is longer than pattern", () => {
    expect(matchesTopic("a/b", "a/b/c")).toBe(false);
  });

  it("handles empty segments correctly", () => {
    expect(matchesTopic("factory//temp", "factory//temp")).toBe(true);
  });
});

describe("safeParsePayload", () => {
  it("passes through JSON objects", () => {
    expect(safeParsePayload(Buffer.from('{"temp":22}'))).toEqual({ temp: 22 });
  });

  it("wraps JSON arrays in a value key", () => {
    expect(safeParsePayload(Buffer.from("[1,2,3]"))).toEqual({
      value: [1, 2, 3],
    });
  });

  it("wraps JSON strings in a value key", () => {
    expect(safeParsePayload(Buffer.from('"hello"'))).toEqual({
      value: "hello",
    });
  });

  it("wraps JSON numbers in a value key", () => {
    expect(safeParsePayload(Buffer.from("42"))).toEqual({ value: 42 });
  });

  it("wraps JSON null in a value key", () => {
    expect(safeParsePayload(Buffer.from("null"))).toEqual({ value: null });
  });

  it("returns hex for invalid JSON binary data", () => {
    expect(safeParsePayload(Buffer.from([0xff, 0xfe]))).toEqual({
      raw: "fffe",
      size: 2,
    });
  });

  it("returns raw and size for non-JSON text", () => {
    const result = safeParsePayload(Buffer.from("not json"));
    expect(result).toHaveProperty("raw");
    expect(result).toHaveProperty("size");
  });
});
