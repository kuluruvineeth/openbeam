import type { VectorTensor, VideoVectorTensor } from "./schemas";

export function escapeYqlString(query: string): string {
  return query.replace(/["\\]/g, "\\$&");
}

export function buildVectorQueryFeatures(embedding: number[]): {
  query_embedding: VectorTensor;
} {
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

export function buildVideoVectorQueryFeatures(embedding: number[]): {
  video_embedding: VideoVectorTensor;
} {
  if (embedding.length === 0) {
    throw new Error("Embedding is required for video similarity search");
  }

  return {
    video_embedding: {
      type: `tensor<float>(x[${embedding.length}])`,
      values: embedding,
    },
  };
}
