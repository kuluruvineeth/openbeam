export const TWENTY_FOUR_HOURS_SECONDS = 86_400;

export const EmbeddingCacheKeys = {
  embedding: (model: string, hash: string) => `emb:${model}:${hash}`,
};
