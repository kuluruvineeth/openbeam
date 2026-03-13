import type { MediaVectorTensor, SparseTensor, VectorTensor } from "./schemas";

export function escapeYqlString(query: string): string {
  return query.replace(/["\\]/g, "\\$&");
}

export function serializeIndexedTensor(values: number[]): string {
  return `{${values.map((v, i) => `{x:${i}}:${v}`).join(",")}}`;
}

export function serializeVectorTensor(tensor: VectorTensor): string {
  return serializeIndexedTensor(tensor.values);
}

export function serializeSparseTensor(tensor: SparseTensor): string {
  return `{${tensor.cells
    .map(
      (c) =>
        `{${Object.entries(c.address)
          .map(([k, v]) => `${k}:${v}`)
          .join(",")}}:${c.value}`
    )
    .join(",")}}`;
}

export function serializeSparseFromRecord(
  sparse: Record<string, number>
): string {
  return `{${Object.entries(sparse)
    .map(([token, value]) => `{token:${token}}:${value}`)
    .join(",")}}`;
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
