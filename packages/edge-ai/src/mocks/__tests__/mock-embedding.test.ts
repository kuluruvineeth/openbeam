import { describe, expect, it } from "bun:test";
import { MockEmbeddingModel } from "../mock-embedding";

describe("MockEmbeddingModel", () => {
  it("returns vector with correct dimensions", async () => {
    const model = new MockEmbeddingModel({ dimensions: 128 });
    const vector = await model.embed("test");
    expect(vector).toBeInstanceOf(Float32Array);
    expect(vector.length).toBe(128);
  });

  it("uses default dimensions of 384", async () => {
    const model = new MockEmbeddingModel();
    const vector = await model.embed("test");
    expect(vector.length).toBe(384);
  });

  it("returns deterministic vectors for the same input", async () => {
    const model = new MockEmbeddingModel();
    const v1 = await model.embed("hello world");
    const v2 = await model.embed("hello world");
    expect(Array.from(v1)).toEqual(Array.from(v2));
  });

  it("returns different vectors for different inputs", async () => {
    const model = new MockEmbeddingModel();
    const v1 = await model.embed("hello");
    const v2 = await model.embed("goodbye");

    let same = true;
    for (let i = 0; i < v1.length; i += 1) {
      if (v1[i] !== v2[i]) {
        same = false;
        break;
      }
    }
    expect(same).toBe(false);
  });

  it("produces unit vectors (norm close to 1)", async () => {
    const model = new MockEmbeddingModel();
    const vector = await model.embed("normalize me");
    let norm = 0;
    for (let i = 0; i < vector.length; i += 1) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);
    expect(Math.abs(norm - 1)).toBeLessThan(0.001);
  });

  it("embeds batch of texts", async () => {
    const model = new MockEmbeddingModel({ dimensions: 64 });
    const vectors = await model.embedBatch(["a", "b", "c"]);
    expect(vectors).toHaveLength(3);
    for (const v of vectors) {
      expect(v.length).toBe(64);
    }
  });

  it("batch results match individual embeds", async () => {
    const model = new MockEmbeddingModel();
    const texts = ["alpha", "beta"];
    const batchResults = await model.embedBatch(texts);
    const individual0 = await model.embed("alpha");
    const individual1 = await model.embed("beta");
    expect(Array.from(batchResults[0])).toEqual(Array.from(individual0));
    expect(Array.from(batchResults[1])).toEqual(Array.from(individual1));
  });

  it("reports correct model ID", () => {
    const model = new MockEmbeddingModel({ modelId: "test-emb" });
    expect(model.modelId()).toBe("test-emb");
  });

  it("uses default model ID", () => {
    const model = new MockEmbeddingModel();
    expect(model.modelId()).toBe("mock-embedding");
  });

  it("reports dimensions", () => {
    const model = new MockEmbeddingModel({ dimensions: 256 });
    expect(model.dimensions()).toBe(256);
  });

  it("reports availability", async () => {
    const model = new MockEmbeddingModel();
    expect(await model.isAvailable()).toBe(true);

    model.setAvailable(false);
    expect(await model.isAvailable()).toBe(false);
  });

  it("handles empty string", async () => {
    const model = new MockEmbeddingModel();
    const vector = await model.embed("");
    expect(vector.length).toBe(384);
  });

  it("handles very long strings", async () => {
    const model = new MockEmbeddingModel();
    const longText = "a".repeat(10000);
    const vector = await model.embed(longText);
    expect(vector.length).toBe(384);
    let norm = 0;
    for (let i = 0; i < vector.length; i += 1) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);
    expect(Math.abs(norm - 1)).toBeLessThan(0.001);
  });
});
