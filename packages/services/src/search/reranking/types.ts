export interface RerankDocument {
  id: string;
  content: string;
  title?: string;
  score?: number;
  rank?: number;
}

export interface RerankRequest {
  query: string;
  documents: RerankDocument[];
  topK?: number;
}

export interface RerankResult {
  id: string;
  score: number;
  originalScore: number | null;
  originalRank: number | null;
}

export interface RerankResponse {
  results: RerankResult[];
  elapsedMs: number;
  model: string;
}

export interface RerankStats {
  model: string;
  device: string;
  cache: {
    memoryHits: number;
    redisHits: number;
    misses: number;
    total: number;
    hitRate: number;
    memorySize: number;
  };
}
