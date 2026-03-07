import type { EmbeddingModel } from "./types";

export const OPENBEAM_EMBEDDING_MODELS: EmbeddingModel[] = [
  {
    id: "bge-m3",
    name: "BGE-M3",
    provider: "openbeam",
    dimensions: 1024,
    maxTokens: 8192,
    supportsSparse: true,
    supportsMultilingual: true,
    isLocal: true,
    pricing: { inputPer1M: 0 },
  },
];

export const OPENAI_EMBEDDING_MODELS: EmbeddingModel[] = [
  {
    id: "text-embedding-3-large",
    name: "Text Embedding 3 Large",
    provider: "openai",
    dimensions: 3072,
    maxTokens: 8191,
    supportsMultilingual: true,
    pricing: { inputPer1M: 0.13 },
  },
  {
    id: "text-embedding-3-small",
    name: "Text Embedding 3 Small",
    provider: "openai",
    dimensions: 1536,
    maxTokens: 8191,
    supportsMultilingual: true,
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
    supportsMultilingual: true,
    pricing: { inputPer1M: 0.025 },
  },
  {
    id: "text-embedding-005",
    name: "Text Embedding 005",
    provider: "google",
    dimensions: 768,
    maxTokens: 2048,
    supportsMultilingual: true,
    pricing: { inputPer1M: 0.025 },
  },
];

export const COHERE_EMBEDDING_MODELS: EmbeddingModel[] = [
  {
    id: "embed-v4",
    name: "Cohere Embed v4",
    provider: "cohere",
    dimensions: 1024,
    maxTokens: 512,
    supportsMultilingual: true,
    pricing: { inputPer1M: 0.1 },
  },
  {
    id: "embed-multilingual-v3",
    name: "Cohere Embed Multilingual v3",
    provider: "cohere",
    dimensions: 1024,
    maxTokens: 512,
    supportsMultilingual: true,
    pricing: { inputPer1M: 0.1 },
  },
  {
    id: "embed-english-v3",
    name: "Cohere Embed English v3",
    provider: "cohere",
    dimensions: 1024,
    maxTokens: 512,
    pricing: { inputPer1M: 0.1 },
  },
];

export const VOYAGE_EMBEDDING_MODELS: EmbeddingModel[] = [
  {
    id: "voyage-3-large",
    name: "Voyage 3 Large",
    provider: "voyage",
    dimensions: 2048,
    maxTokens: 32_000,
    supportsMultilingual: true,
    pricing: { inputPer1M: 0.12 },
  },
  {
    id: "voyage-3.5",
    name: "Voyage 3.5",
    provider: "voyage",
    dimensions: 1024,
    maxTokens: 32_000,
    supportsMultilingual: true,
    pricing: { inputPer1M: 0.06 },
  },
  {
    id: "voyage-3.5-lite",
    name: "Voyage 3.5 Lite",
    provider: "voyage",
    dimensions: 512,
    maxTokens: 32_000,
    supportsMultilingual: true,
    pricing: { inputPer1M: 0.02 },
  },
  {
    id: "voyage-code-3",
    name: "Voyage Code 3",
    provider: "voyage",
    dimensions: 1024,
    maxTokens: 16_000,
    pricing: { inputPer1M: 0.06 },
  },
  {
    id: "voyage-finance-2",
    name: "Voyage Finance 2",
    provider: "voyage",
    dimensions: 1024,
    maxTokens: 32_000,
    pricing: { inputPer1M: 0.06 },
  },
  {
    id: "voyage-law-2",
    name: "Voyage Law 2",
    provider: "voyage",
    dimensions: 1024,
    maxTokens: 16_000,
    pricing: { inputPer1M: 0.06 },
  },
];

export const JINA_EMBEDDING_MODELS: EmbeddingModel[] = [
  {
    id: "jina-embeddings-v3",
    name: "Jina Embeddings v3",
    provider: "jina",
    dimensions: 1024,
    maxTokens: 8192,
    supportsMultilingual: true,
    pricing: { inputPer1M: 0.02 },
  },
  {
    id: "jina-clip-v2",
    name: "Jina CLIP v2",
    provider: "jina",
    dimensions: 1024,
    maxTokens: 8192,
    supportsMultilingual: true,
    pricing: { inputPer1M: 0.02 },
  },
];

export const EMBEDDING_MODELS: EmbeddingModel[] = [
  ...OPENBEAM_EMBEDDING_MODELS,
  ...OPENAI_EMBEDDING_MODELS,
  ...GOOGLE_EMBEDDING_MODELS,
  ...COHERE_EMBEDDING_MODELS,
  ...VOYAGE_EMBEDDING_MODELS,
  ...JINA_EMBEDDING_MODELS,
];

export const DEFAULT_EMBEDDING_MODEL_ID = "bge-m3";
