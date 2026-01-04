import type { Database } from "../index";

export function createRAGInteraction(
  db: Database,
  data: {
    userId: string;
    teamId: string;
    conversationId?: string;
    query: string;
    queryHash: string;
    queryIntent?: string;
    retrievedDocs: number;
    usedChunks: number;
    avgChunkScore?: number;
    answerLength: number;
    citationCount: number;
    groundingScore?: number;
    confidence?: string;
    retrievalMs: number;
    chunkingMs: number;
    generationMs: number;
    groundingMs?: number;
    totalMs: number;
    firstTokenMs?: number;
    feedbackType?: string;
    feedbackNote?: string;
  }
) {
  return db.rAGInteraction.create({ data });
}

export function updateRAGInteractionFeedback(
  db: Database,
  id: string,
  feedbackType: string,
  feedbackNote?: string
) {
  return db.rAGInteraction.update({
    where: { id },
    data: {
      feedbackType,
      feedbackNote,
    },
  });
}
