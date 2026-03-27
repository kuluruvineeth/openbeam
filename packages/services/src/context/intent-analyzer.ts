import type { ContextType, TypedQuery } from "@openbeam/types/context";

const VALID_CONTEXT_TYPES = new Set<string>([
  "resource",
  "memory",
  "skill",
  "tool",
]);

function toContextType(value: string | undefined): ContextType | null {
  if (value && VALID_CONTEXT_TYPES.has(value)) {
    return value as ContextType;
  }
  return null;
}

export interface CompletionClient {
  complete(
    messages: Array<{ role: string; content: string }>,
    options?: { maxTokens?: number }
  ): Promise<{ content: string }>;
}

export const INTENT_ANALYSIS_SYSTEM_PROMPT = [
  "Analyze the user's intent and decompose into 1-5 sub-queries.",
  "Each sub-query targets a specific context type: resource, memory, skill, or tool.",
  "Assign priority 1-5 (5 = highest).",
  "If the query is simple and doesn't need decomposition, return it as a single query with priority 5.",
  "",
  "Return a JSON array of objects with fields: query, contextType, priority.",
  'Example: [{"query": "find deployment docs", "contextType": "resource", "priority": 5}]',
].join("\n");

export class IntentAnalyzer {
  private readonly completionService?: CompletionClient;

  constructor(completionService?: CompletionClient) {
    this.completionService = completionService;
  }

  async analyze(params: {
    query: string;
    sessionSummary?: string;
    recentMessages?: Array<{ role: string; content: string }>;
  }): Promise<TypedQuery[]> {
    const hasContext =
      params.sessionSummary ||
      (params.recentMessages && params.recentMessages.length > 0);

    if (!(hasContext && this.completionService)) {
      return [{ query: params.query, contextType: null, priority: 5 }];
    }

    const contextBlock = [
      params.sessionSummary ? `Session summary: ${params.sessionSummary}` : "",
      params.recentMessages?.length
        ? `Recent messages:\n${params.recentMessages.map((m) => `[${m.role}]: ${m.content}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const result = await this.completionService.complete(
      [
        { role: "system", content: INTENT_ANALYSIS_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Context:\n${contextBlock}\n\nUser query: ${params.query}\n\nReturn JSON array of sub-queries.`,
        },
      ],
      { maxTokens: 500 }
    );

    return this.parseResponse(result.content, params.query);
  }

  private parseResponse(text: string, fallbackQuery: string): TypedQuery[] {
    const fallback: TypedQuery[] = [
      { query: fallbackQuery, contextType: null, priority: 5 },
    ];

    try {
      const parsed = JSON.parse(text);
      const queries: unknown[] = Array.isArray(parsed)
        ? parsed
        : ((parsed as Record<string, unknown>).queries as unknown[]);

      if (!Array.isArray(queries) || queries.length === 0) {
        return fallback;
      }

      return queries.slice(0, 5).map((q: unknown): TypedQuery => {
        const raw = q as Record<string, unknown>;
        return {
          query: (raw.query as string) ?? fallbackQuery,
          contextType: toContextType(raw.contextType as string | undefined),
          priority: (raw.priority as number) ?? 3,
        };
      });
    } catch {
      return fallback;
    }
  }
}
