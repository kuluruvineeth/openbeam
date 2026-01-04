export const ANSWER_CACHE_TTL = 3600;
export const CHUNK_CACHE_TTL = 7200;
export const GROUNDING_CACHE_TTL = 1800;

export const RAGCacheKeys = {
  answerCache: (teamId: string, queryHash: string) =>
    `rag:answer:${teamId}:${queryHash}`,

  chunkCache: (teamId: string, docId: string) =>
    `rag:chunks:${teamId}:${docId}`,

  groundingCache: (teamId: string, answerHash: string) =>
    `rag:grounding:${teamId}:${answerHash}`,

  queryAnalysis: (queryHash: string) => `rag:analysis:${queryHash}`,

  contextCache: (conversationId: string) => `rag:context:${conversationId}`,
};
