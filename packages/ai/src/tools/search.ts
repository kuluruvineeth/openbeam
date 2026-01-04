import Fuse from "fuse.js";
import { z } from "zod";
import { embedQuery } from "../embeddings";
import { defineTool, success } from "./builder";
import { toolRegistry } from "./registry";
import type { ToolMetadata } from "./types";

interface ToolSearchConfig {
  bm25Weight: number;
  embeddingWeight: number;
  topK: number;
  threshold: number;
}

const DEFAULT_CONFIG: ToolSearchConfig = {
  bm25Weight: 0.5,
  embeddingWeight: 0.5,
  topK: 5,
  threshold: 0.3,
};

export class ToolSearchService {
  private fuse: Fuse<ToolMetadata> | null = null;
  private readonly embeddings = new Map<string, number[]>();
  private initialized = false;
  private readonly config: ToolSearchConfig;

  constructor(config: Partial<ToolSearchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const metadata = toolRegistry.getAllMetadata();
    if (metadata.length === 0) {
      return;
    }

    this.fuse = new Fuse(metadata, {
      keys: [
        { name: "name", weight: 0.4 },
        { name: "description", weight: 0.4 },
        { name: "searchKeywords", weight: 0.2 },
      ],
      includeScore: true,
      threshold: this.config.threshold,
      ignoreLocation: true,
      findAllMatches: true,
    });

    const embeddingPromises = metadata.map(async (tool) => {
      const text = buildToolText(tool);
      const embedding = await embedQuery(text);
      this.embeddings.set(tool.name, embedding);
    });

    await Promise.all(embeddingPromises);
    this.initialized = true;
  }

  async search(query: string): Promise<ToolMetadata[]> {
    await this.initialize();

    if (!this.fuse || this.embeddings.size === 0) {
      return [];
    }

    const bm25Results = this.fuse.search(query);
    const bm25Scores = new Map<string, number>(
      bm25Results.map((r) => [r.item.name, 1 - (r.score ?? 0)])
    );

    const queryEmbedding = await embedQuery(query);
    const embeddingScores = new Map<string, number>();

    for (const [name, embedding] of this.embeddings) {
      const similarity = cosineSimilarity(queryEmbedding, embedding);
      embeddingScores.set(name, similarity);
    }

    const allToolNames = Array.from(this.embeddings.keys());
    const hybridScores = allToolNames
      .map((name) => ({
        name,
        score:
          (bm25Scores.get(name) ?? 0) * this.config.bm25Weight +
          (embeddingScores.get(name) ?? 0) * this.config.embeddingWeight,
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.topK);

    return hybridScores
      .map((s) => toolRegistry.getMetadata(s.name))
      .filter((m): m is ToolMetadata => m !== undefined);
  }

  invalidate(): void {
    this.fuse = null;
    this.embeddings.clear();
    this.initialized = false;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

function buildToolText(tool: ToolMetadata): string {
  const parts = [tool.name, tool.description];
  if (tool.searchKeywords?.length) {
    parts.push(tool.searchKeywords.join(" "));
  }
  return parts.join(" ");
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

export const toolSearchService = new ToolSearchService();

export const toolSearchTool = defineTool({
  name: "tool_search",
  description: `Search for available tools by describing what you want to do.
Returns matching tool names and descriptions.
Use this when you need to find tools for a specific capability.`,
  category: "search",
  deferLoading: false,
  searchKeywords: ["find", "discover", "lookup", "capability", "function"],

  parameters: z.object({
    query: z
      .string()
      .min(1)
      .describe("Natural language description of the capability you need"),
    limit: z
      .number()
      .min(1)
      .max(20)
      .optional()
      .default(5)
      .describe("Maximum number of tools to return"),
  }),

  async execute({ query, limit }) {
    const service = new ToolSearchService({ topK: limit });
    const results = await service.search(query);

    return success({
      tools: results.map((t) => ({
        name: t.name,
        description: t.description,
        category: t.category,
      })),
      count: results.length,
    });
  },
});
