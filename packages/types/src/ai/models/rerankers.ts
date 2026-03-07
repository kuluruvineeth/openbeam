import type { RerankerModel } from "./types";

export const OPENBEAM_RERANKER_MODELS: RerankerModel[] = [
  {
    id: "bge-reranker-v2-m3",
    name: "BGE Reranker v2 M3",
    provider: "openbeam",
    maxDocuments: 100,
    supportsMultilingual: true,
    isLocal: true,
    pricing: { perSearch: 0 },
  },
];

export const COHERE_RERANKER_MODELS: RerankerModel[] = [
  {
    id: "rerank-v3.5",
    name: "Cohere Rerank v3.5",
    provider: "cohere",
    maxDocuments: 1000,
    supportsMultilingual: true,
    pricing: { perSearch: 0.002 },
  },
  {
    id: "rerank-v3.5-nimble",
    name: "Cohere Rerank v3.5 Nimble",
    provider: "cohere",
    maxDocuments: 1000,
    supportsMultilingual: true,
    pricing: { perSearch: 0.001 },
  },
];

export const JINA_RERANKER_MODELS: RerankerModel[] = [
  {
    id: "jina-reranker-v2-base-multilingual",
    name: "Jina Reranker v2 Multilingual",
    provider: "jina",
    maxDocuments: 100,
    supportsMultilingual: true,
    pricing: { perSearch: 0.001 },
  },
];

export const RERANKER_MODELS: RerankerModel[] = [
  ...OPENBEAM_RERANKER_MODELS,
  ...COHERE_RERANKER_MODELS,
  ...JINA_RERANKER_MODELS,
];

export const DEFAULT_RERANKER_MODEL_ID = "bge-reranker-v2-m3";
