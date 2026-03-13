import type { MediaVectorTensor, VectorTensor } from "./schemas";

export function escapeYqlString(query: string): string {
  return query.replace(/["\\]/g, "\\$&");
}

export function buildVectorQueryFeatures(embedding: number[]): {
  embedding_v2: VectorTensor;
} {
  if (embedding.length === 0) {
    throw new Error("Embedding is required for similarity search");
  }

  return {
    embedding_v2: {
      type: `tensor<float>(x[${embedding.length}])`,
      values: embedding,
    },
  };
}

export function buildMediaVectorQueryFeatures(embedding: number[]): {
  media_embedding: MediaVectorTensor;
} {
  if (embedding.length === 0) {
    throw new Error("Embedding is required for media similarity search");
  }

  return {
    media_embedding: {
      type: `tensor<float>(x[${embedding.length}])`,
      values: embedding,
    },
  };
}
