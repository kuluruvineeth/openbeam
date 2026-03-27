import { searchContext } from "@openbeam/vespa";

export interface DeduplicationResult {
  created: number;
  merged: number;
  skipped: number;
  deleted: number;
}

export const DEDUP_SIMILARITY_THRESHOLD = 0.85;
export const MAX_SIMILAR_CANDIDATES = 5;
export const MAX_CANDIDATES_PER_BATCH = 10;

export async function findSimilarMemories(
  teamId: string,
  ownerId: string,
  category: string,
  embedding: number[]
): Promise<Array<{ uri: string; abstractText: string; score: number }>> {
  const results = await searchContext({
    teamId,
    contextType: "memory",
    category,
    ownerId,
    embedding,
    rankingProfile: "semantic",
    limit: MAX_SIMILAR_CANDIDATES,
  });

  return results.hits
    .filter((hit) => hit.relevance >= DEDUP_SIMILARITY_THRESHOLD)
    .map((hit) => ({
      uri: hit.document.uri,
      abstractText: hit.document.abstract_text,
      score: hit.relevance,
    }));
}

export const DEDUP_DECISION_SYSTEM_PROMPT = [
  "Given new memory candidates and existing similar memories,",
  "decide for each candidate:",
  "- skip: the candidate is a duplicate of an existing memory",
  "- create: the candidate is genuinely new information",
  "- merge: the candidate should be combined with an existing memory",
  "- delete: the candidate replaces an outdated existing memory",
  "",
  "For merge/delete, specify which existing memory URI is affected.",
  "Provide a brief reason for each decision.",
].join("\n");
