import type {
  ContextSearchResult,
  ContextType,
  HierarchicalSearchResult,
} from "@openbeam/types/context";
import type { CompletionClient } from "./intent-analyzer";
import { IntentAnalyzer } from "./intent-analyzer";
import { HierarchicalRetriever } from "./retriever";

export interface FindOptions {
  contextType?: ContextType;
  category?: string;
  embedding?: number[];
  limit?: number;
}

export class ContextSearchService {
  private readonly retriever = new HierarchicalRetriever();
  private readonly intentAnalyzer: IntentAnalyzer;

  constructor(completionService?: CompletionClient) {
    this.intentAnalyzer = new IntentAnalyzer(completionService);
  }

  find(
    query: string,
    teamId: string,
    options?: FindOptions
  ): Promise<ContextSearchResult[]> {
    return this.retriever.find(query, teamId, options);
  }

  async search(params: {
    query: string;
    teamId: string;
    sessionSummary?: string;
    recentMessages?: Array<{ role: string; content: string }>;
    contextType?: ContextType;
    limit?: number;
  }): Promise<HierarchicalSearchResult> {
    const typedQueries = await this.intentAnalyzer.analyze({
      query: params.query,
      sessionSummary: params.sessionSummary,
      recentMessages: params.recentMessages,
    });

    const queryResults = await Promise.all(
      typedQueries.map((tq) =>
        this.retriever.search({
          query: tq.query,
          teamId: params.teamId,
          contextType: tq.contextType ?? params.contextType,
          limit: params.limit,
        })
      )
    );

    const seen = new Set<string>();
    const merged: HierarchicalSearchResult = {
      resources: [],
      memories: [],
      skills: [],
      tools: [],
      total: 0,
      retrievalPath: [],
      trajectory: [],
    };

    for (const result of queryResults) {
      for (const category of [
        "resources",
        "memories",
        "skills",
        "tools",
      ] as const) {
        for (const item of result[category]) {
          if (!seen.has(item.uri)) {
            seen.add(item.uri);
            merged[category].push(item);
          }
        }
      }
      merged.retrievalPath.push(...result.retrievalPath);
      merged.trajectory.push(...result.trajectory);
    }

    for (const category of [
      "resources",
      "memories",
      "skills",
      "tools",
    ] as const) {
      merged[category].sort((a, b) => b.score - a.score);
    }

    merged.total = seen.size;
    return merged;
  }
}
