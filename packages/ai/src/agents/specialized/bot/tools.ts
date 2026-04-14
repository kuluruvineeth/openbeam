import { tool } from "ai";
import { z } from "zod";

interface BotToolContext {
  teamId: string;
  hybridSearch: (params: {
    query: string;
    teamId: string;
    limit: number;
  }) => Promise<{
    documents: Array<{
      title: string;
      content: string;
      content_plain?: string;
      url?: string;
      connector_type: string;
      relevanceScore: number;
      author_name?: string;
      author_email?: string;
    }>;
  }>;
  ragAnswer: (params: { query: string; teamId: string }) => Promise<{
    answer: string;
    confidence: number;
    citations: Array<{
      title: string;
      url?: string;
      snippet: string;
      connectorType?: string;
    }>;
  }>;
}

const searchParams = z.object({
  query: z.string(),
  limit: z.number().optional().default(10),
});

const questionParams = z.object({
  question: z.string(),
});

const topicParams = z.object({
  topic: z.string(),
});

export function buildBotTools(ctx: BotToolContext) {
  return {
    search_documents: tool({
      description:
        "Search across all connected enterprise data sources. Use for finding files, docs, messages.",
      parameters: searchParams,
      execute: async (params: z.infer<typeof searchParams>) => {
        const results = await ctx.hybridSearch({
          query: params.query,
          teamId: ctx.teamId,
          limit: params.limit ?? 10,
        });
        return {
          type: "search_results" as const,
          results: results.documents.map((doc) => ({
            title: doc.title,
            snippet:
              doc.content_plain?.slice(0, 200) ?? doc.content.slice(0, 200),
            url: doc.url,
            source: doc.connector_type,
            score: doc.relevanceScore,
          })),
        };
      },
    }),

    answer_question: tool({
      description:
        "Generate a grounded answer with citations. Use for questions requiring synthesis.",
      parameters: questionParams,
      execute: async (params: z.infer<typeof questionParams>) => {
        const result = await ctx.ragAnswer({
          query: params.question,
          teamId: ctx.teamId,
        });
        return {
          type: "answer" as const,
          answer: result.answer,
          citations: result.citations.slice(0, 5).map((c, i) => ({
            index: i + 1,
            title: c.title,
            url: c.url,
            snippet: c.snippet,
            source: c.connectorType,
          })),
          confidence: result.confidence,
        };
      },
    }),

    find_experts: tool({
      description:
        "Find people who are experts on a topic. Use for 'who knows about X'.",
      parameters: topicParams,
      execute: async (params: z.infer<typeof topicParams>) => {
        const results = await ctx.hybridSearch({
          query: params.topic,
          teamId: ctx.teamId,
          limit: 20,
        });
        const authorMap = new Map<
          string,
          { name: string; email?: string; count: number }
        >();
        for (const doc of results.documents) {
          const name = doc.author_name;
          if (!name) {
            continue;
          }
          const existing = authorMap.get(name);
          if (existing) {
            existing.count += 1;
          } else {
            authorMap.set(name, {
              name,
              email: doc.author_email,
              count: 1,
            });
          }
        }
        const experts = [...authorMap.values()]
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        return {
          type: "expert_list" as const,
          topic: params.topic,
          experts: experts.map((e) => ({
            name: e.name,
            email: e.email,
            expertise: [params.topic],
            documentCount: e.count,
          })),
        };
      },
    }),
  };
}
