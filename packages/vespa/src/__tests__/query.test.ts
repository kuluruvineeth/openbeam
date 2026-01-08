import { describe, expect, it } from "bun:test";
import {
  buildMediaVectorQueryFeatures,
  buildVectorQueryFeatures,
  escapeYqlString,
} from "../query";

describe("escapeYqlString", () => {
  it("escapes double quotes", () => {
    expect(escapeYqlString('hello "world"')).toBe('hello \\"world\\"');
  });

  it("escapes backslashes", () => {
    expect(escapeYqlString("hello\\world")).toBe("hello\\\\world");
  });

  it("escapes both quotes and backslashes", () => {
    expect(escapeYqlString('path\\to\\"file"')).toBe(
      'path\\\\to\\\\\\"file\\"'
    );
  });

  it("returns unchanged string when no escaping needed", () => {
    expect(escapeYqlString("hello world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(escapeYqlString("")).toBe("");
  });

  it("handles string with only special characters", () => {
    expect(escapeYqlString('""\\\\')).toBe('\\"\\"\\\\\\\\');
  });
});

describe("buildVectorQueryFeatures", () => {
  it("creates correct tensor format for 1536-dimensional embedding", () => {
    const embedding = Array.from({ length: 1536 }, (_, i) => i * 0.001);
    const result = buildVectorQueryFeatures(embedding);

    expect(result.query_embedding).toEqual({
      type: "tensor<float>(x[1536])",
      values: embedding,
    });
  });

  it("creates correct tensor format for 1024-dimensional embedding", () => {
    const embedding = Array.from({ length: 1024 }, (_, i) => i * 0.001);
    const result = buildVectorQueryFeatures(embedding);

    expect(result.query_embedding).toEqual({
      type: "tensor<float>(x[1024])",
      values: embedding,
    });
  });

  it("throws error for empty embedding", () => {
    expect(() => buildVectorQueryFeatures([])).toThrow(
      "Embedding is required for similarity search"
    );
  });

  it("preserves embedding values exactly", () => {
    const embedding = [0.1, 0.2, 0.3, -0.5, 0.0];
    const result = buildVectorQueryFeatures(embedding);

    expect(result.query_embedding.values).toEqual(embedding);
    expect(result.query_embedding.type).toBe("tensor<float>(x[5])");
  });
});

describe("buildMediaVectorQueryFeatures", () => {
  it("creates correct tensor format for media embedding", () => {
    const embedding = Array.from({ length: 768 }, (_, i) => i * 0.001);
    const result = buildMediaVectorQueryFeatures(embedding);

    expect(result.media_embedding).toEqual({
      type: "tensor<float>(x[768])",
      values: embedding,
    });
  });

  it("throws error for empty embedding", () => {
    expect(() => buildMediaVectorQueryFeatures([])).toThrow(
      "Embedding is required for media similarity search"
    );
  });

  it("preserves embedding values exactly", () => {
    const embedding = [0.5, -0.5, 1.0, -1.0];
    const result = buildMediaVectorQueryFeatures(embedding);

    expect(result.media_embedding.values).toEqual(embedding);
    expect(result.media_embedding.type).toBe("tensor<float>(x[4])");
  });
});
