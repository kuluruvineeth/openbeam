import crypto from "node:crypto";

export function serializeEmbedding(
  embedding: number[]
): Uint8Array<ArrayBuffer> {
  const float32 = new Float32Array(embedding);
  return new Uint8Array(float32.buffer) as Uint8Array<ArrayBuffer>;
}

export function deserializeEmbedding(data: Uint8Array<ArrayBuffer>): number[] {
  const float32 = new Float32Array(
    data.buffer,
    data.byteOffset,
    data.length / 4
  );
  return Array.from(float32);
}

export function hashQuery(query: string): string {
  return crypto.createHash("sha256").update(query).digest("hex").slice(0, 16);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}
