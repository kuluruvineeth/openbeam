import type { VectorProvider } from "@openplane/types/edge/search";

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }
  return dotProduct / denominator;
}

export class InMemoryVectorProvider implements VectorProvider {
  private readonly vectors = new Map<string, Float32Array>();

  upsert(documentId: string, vector: Float32Array): Promise<void> {
    this.vectors.set(documentId, new Float32Array(vector));
    return Promise.resolve();
  }

  remove(documentId: string): Promise<void> {
    this.vectors.delete(documentId);
    return Promise.resolve();
  }

  search(
    queryVector: Float32Array,
    limit: number
  ): Promise<Array<{ documentId: string; score: number }>> {
    const results: Array<{ documentId: string; score: number }> = [];

    for (const [documentId, vector] of this.vectors) {
      if (vector.length !== queryVector.length) {
        continue;
      }
      const score = cosineSimilarity(queryVector, vector);
      results.push({ documentId, score });
    }

    results.sort((a, b) => b.score - a.score);
    return Promise.resolve(results.slice(0, limit));
  }

  clear(): Promise<void> {
    this.vectors.clear();
    return Promise.resolve();
  }

  documentCount(): Promise<number> {
    return Promise.resolve(this.vectors.size);
  }
}
