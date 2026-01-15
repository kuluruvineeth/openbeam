import type { EmbeddingModel } from "./types";

export const OPENAI_EMBEDDING_MODELS: EmbeddingModel[] = [
  {
    id: "text-embedding-3-large",
    name: "Text Embedding 3 Large",
    provider: "openai",
    dimensions: 3072,
    maxTokens: 8191,
    pricing: { inputPer1M: 0.13 },
  },
  {
    id: "text-embedding-3-small",
    name: "Text Embedding 3 Small",
    provider: "openai",
    dimensions: 1536,
    maxTokens: 8191,
    pricing: { inputPer1M: 0.02 },
  },
];

export const GOOGLE_EMBEDDING_MODELS: EmbeddingModel[] = [
  {
    id: "text-embedding-004",
    name: "Text Embedding 004",
    provider: "google",
    dimensions: 768,
    maxTokens: 2048,
    pricing: { inputPer1M: 0.025 },
  },
  {
    id: "text-embedding-005",
    name: "Text Embedding 005",
    provider: "google",
    dimensions: 768,
    maxTokens: 2048,
    pricing: { inputPer1M: 0.025 },
  },
];

export const EMBEDDING_MODELS: EmbeddingModel[] = [
  ...OPENAI_EMBEDDING_MODELS,
  ...GOOGLE_EMBEDDING_MODELS,
];
