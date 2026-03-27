import { getContextCache } from "@openbeam/redis";
import type {
  ContextSearchResult,
  ContextType,
  HierarchicalSearchResult,
  RetrievalStep,
} from "@openbeam/types/context";
import { searchContext, searchContextChildren } from "@openbeam/vespa";
import { finalScore, hotnessScore, propagateScore } from "./hotness";

const MAX_CONVERGENCE_ROUNDS = 3;
const TOP_K = 10;

interface RetrieverParams {
  query: string;
  teamId: string;
  userId?: string;
  agentId?: string;
  contextType?: ContextType;
  embedding?: number[];
  limit?: number;
}

interface QueueEntry {
  uri: string;
  score: number;
  depth: number;
}

interface ScoredResult extends ContextSearchResult {
  rawScore: number;
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const item of a) {
    if (!b.has(item)) {
      return false;
    }
  }
  return true;
}

export class HierarchicalRetriever {
  async search(params: RetrieverParams): Promise<HierarchicalSearchResult> {
    const limit = params.limit ?? 20;
    const retrievalPath: string[] = [];
    const trajectory: RetrievalStep[] = [];

    const globalResults = await searchContext({
      teamId: params.teamId,
      contextType: params.contextType,
      isLeaf: false,
      embedding: params.embedding,
      rankingProfile: "hybrid",
      limit: TOP_K,
    });
    retrievalPath.push(`global:${globalResults.hits.length} directories`);

    const queue: QueueEntry[] = globalResults.hits.map((h) => ({
      uri: h.document.uri,
      score: h.relevance,
      depth: 0,
    }));
    queue.sort((a, b) => b.score - a.score);

    const results: ScoredResult[] = [];
    const visited = new Set<string>();
    let convergenceCount = 0;
    let previousTopK = new Set<string>();

    while (queue.length > 0 && convergenceCount < MAX_CONVERGENCE_ROUNDS) {
      const current = queue.shift();
      if (!current || visited.has(current.uri)) {
        continue;
      }
      visited.add(current.uri);

      const stepStart = performance.now();
      const children = await searchContextChildren(params.teamId, current.uri, {
        contextType: params.contextType,
        embedding: params.embedding,
        limit: 50,
      });

      let topChildScore = 0;
      for (const child of children.hits) {
        const propagated = propagateScore(child.relevance, current.score);
        if (propagated > topChildScore) {
          topChildScore = propagated;
        }

        if (child.document.is_leaf) {
          results.push({
            uri: child.document.uri,
            abstractText: child.document.abstract_text,
            score: propagated,
            rawScore: child.relevance,
            contextType: child.document.context_type as ContextType,
            category: child.document.category ?? null,
            activeCount: child.document.active_count,
            updatedAt: new Date(child.document.updated_at),
            relations: [],
          });
        } else if (!visited.has(child.document.uri)) {
          queue.push({
            uri: child.document.uri,
            score: propagated,
            depth: current.depth + 1,
          });
          queue.sort((a, b) => b.score - a.score);
        }
      }

      retrievalPath.push(
        `traverse:${current.uri}:${children.hits.length} children`
      );

      const currentTopK = new Set(
        results
          .sort((a, b) => b.score - a.score)
          .slice(0, TOP_K)
          .map((r) => r.uri)
      );
      const converged = setsEqual(currentTopK, previousTopK);
      if (converged) {
        convergenceCount += 1;
      } else {
        convergenceCount = 0;
      }
      previousTopK = currentTopK;

      trajectory.push({
        directory: current.uri,
        childrenSearched: children.hits.length,
        topScore: topChildScore,
        converged,
        depth: current.depth,
        durationMs: performance.now() - stepStart,
      });
    }

    const cache = getContextCache();
    const uris = results.map((r) => r.uri);
    const hotnessMap =
      uris.length > 0
        ? await cache.batchGetHotness(params.teamId, uris)
        : new Map<string, number>();

    for (const result of results) {
      const hotness = hotnessScore(
        hotnessMap.get(result.uri) ?? result.activeCount,
        result.updatedAt
      );
      result.score = finalScore(result.rawScore, hotness);
    }

    results.sort((a, b) => b.score - a.score);
    const limited = results.slice(0, limit);

    return {
      resources: limited.filter((r) => r.contextType === "resource"),
      memories: limited.filter((r) => r.contextType === "memory"),
      skills: limited.filter((r) => r.contextType === "skill"),
      tools: limited.filter((r) => r.contextType === "tool"),
      total: limited.length,
      retrievalPath,
      trajectory,
    };
  }

  async find(
    query: string,
    teamId: string,
    options?: {
      contextType?: ContextType;
      embedding?: number[];
      limit?: number;
    }
  ): Promise<ContextSearchResult[]> {
    const results = await searchContext({
      teamId,
      query,
      contextType: options?.contextType,
      embedding: options?.embedding,
      rankingProfile: "hybrid_with_hotness",
      limit: options?.limit ?? 20,
    });

    return results.hits.map((h) => ({
      uri: h.document.uri,
      abstractText: h.document.abstract_text,
      score: h.relevance,
      contextType: h.document.context_type as ContextType,
      category: h.document.category ?? null,
      activeCount: h.document.active_count,
      updatedAt: new Date(h.document.updated_at),
      relations: [],
    }));
  }
}

export { setsEqual };
