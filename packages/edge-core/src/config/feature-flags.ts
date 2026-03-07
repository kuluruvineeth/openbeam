import type { EdgeTier } from "@openbeam/types/edge/tiers";

export interface FeatureFlags {
  fts: boolean;
  vector: boolean;
  slm: boolean;
  rag: boolean;
  fl: boolean;
  conversational: boolean;
  ner: boolean;
}

const TIER_FLAGS: Record<EdgeTier, FeatureFlags> = {
  sensor_gateway: {
    fts: true,
    vector: false,
    slm: false,
    rag: false,
    fl: false,
    conversational: false,
    ner: false,
  },
  standard: {
    fts: true,
    vector: true,
    slm: false,
    rag: false,
    fl: false,
    conversational: false,
    ner: false,
  },
  performance: {
    fts: true,
    vector: true,
    slm: true,
    rag: true,
    fl: false,
    conversational: true,
    ner: true,
  },
  enterprise: {
    fts: true,
    vector: true,
    slm: true,
    rag: true,
    fl: true,
    conversational: true,
    ner: true,
  },
};

export function getFeatureFlags(tier: EdgeTier): FeatureFlags {
  return TIER_FLAGS[tier];
}
