export function escapeYqlString(query: string): string {
  return query.replace(/["\\]/g, "\\$&");
}

export function buildVectorQueryFeatures(
  embedding: number[]
): Record<string, unknown> {
  if (embedding.length === 0) {
    throw new Error("Embedding is required for similarity search");
  }

  return {
    query_embedding: {
      type: `tensor<float>(x[${embedding.length}])`,
      values: embedding,
    },
  };
}
