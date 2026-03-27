import type { TypedQuery } from "@openbeam/types/context";

export const INTENT_ANALYSIS_SYSTEM_PROMPT = [
  "Analyze the user's intent and decompose into 1-5 sub-queries.",
  "Each sub-query targets a specific context type: resource, memory, skill, or tool.",
  "Assign priority 1-5 (5 = highest).",
  "If the query is simple and doesn't need decomposition, return it as a single query with priority 5.",
].join("\n");

export class IntentAnalyzer {
  analyze(params: {
    query: string;
    sessionSummary?: string;
    recentMessages?: Array<{ role: string; content: string }>;
  }): Promise<TypedQuery[]> {
    if (
      !params.sessionSummary &&
      (!params.recentMessages || params.recentMessages.length === 0)
    ) {
      return Promise.resolve([
        { query: params.query, contextType: null, priority: 5 },
      ]);
    }

    return Promise.resolve([
      { query: params.query, contextType: null, priority: 5 },
    ]);
  }
}
