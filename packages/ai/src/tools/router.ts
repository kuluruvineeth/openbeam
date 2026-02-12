import type { ToolCategory, ToolMetadata } from "@openplane/types/ai";

import type { CompositionTracker } from "../observability/composition";
import { toolRegistry } from "./registry";
import { type ToolSearchService, toolSearchService } from "./search";

const WHITESPACE_REGEX = /\s+/;

export interface ToolRouterConfig {
  searchService?: ToolSearchService;
  compositionTracker?: CompositionTracker;
  defaultLimit?: number;
  categoryBoosts?: Partial<Record<ToolCategory, number>>;
}

export interface RouteResult {
  tools: ToolMetadata[];
  reasoning: string;
  confidence: number;
}

export interface ToolSuggestion {
  tool: ToolMetadata;
  reason: string;
  score: number;
}

const CATEGORY_PRIORITY: Record<ToolCategory, number> = {
  search: 10,
  rag: 9,
  documents: 8,
  data: 7,
  analysis: 6,
  connectors: 5,
  media: 4,
  action: 3,
  integration: 2,
  system: 1,
  browser: 0,
  skills: 0,
  canvas: 0,
  mission: 5,
};

export class ToolRouter {
  private readonly searchService: ToolSearchService;
  private readonly compositionTracker: CompositionTracker | null;
  private readonly defaultLimit: number;
  private readonly categoryBoosts: Partial<Record<ToolCategory, number>>;
  private initialized = false;

  constructor(config: ToolRouterConfig = {}) {
    this.searchService = config.searchService ?? toolSearchService;
    this.compositionTracker = config.compositionTracker ?? null;
    this.defaultLimit = config.defaultLimit ?? 5;
    this.categoryBoosts = config.categoryBoosts ?? {};
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.searchService.initialize();
    toolRegistry.setSearchService(this.searchService);

    if (this.compositionTracker) {
      toolRegistry.setCompositionTracker(this.compositionTracker);
    }

    this.initialized = true;
  }

  async route(
    query: string,
    context?: { category?: ToolCategory; limit?: number }
  ): Promise<RouteResult> {
    await this.initialize();

    const limit = context?.limit ?? this.defaultLimit;
    const tools = await this.searchService.search(query);

    let filtered = tools;
    if (context?.category) {
      filtered = tools.filter((t) => t.category === context.category);
    }

    filtered = this.applyBoosts(filtered).slice(0, limit);

    const confidence = this.calculateConfidence(filtered, query);
    const reasoning = this.generateReasoning(filtered, query);

    return { tools: filtered, reasoning, confidence };
  }

  async findBestTool(query: string): Promise<ToolMetadata | null> {
    const result = await this.route(query, { limit: 1 });
    return result.tools[0] ?? null;
  }

  async findToolsForCapability(capability: string): Promise<ToolMetadata[]> {
    await this.initialize();
    return toolRegistry.findByCapability(capability);
  }

  async suggestNextTools(recentTools: string[]): Promise<ToolSuggestion[]> {
    await this.initialize();

    const suggestions = toolRegistry.suggestTools({ recentTools });

    return suggestions.map((tool, index) => ({
      tool,
      reason: this.getToolSuggestionReason(tool, recentTools),
      score: 1 - index * 0.1,
    }));
  }

  async getToolsForWorkflow(
    workflowDescription: string
  ): Promise<ToolMetadata[]> {
    await this.initialize();

    const searchResult = await this.route(workflowDescription, { limit: 10 });
    const tools = searchResult.tools;

    const sortedByPriority = tools.sort((a, b) => {
      const priorityA = CATEGORY_PRIORITY[a.category] ?? 0;
      const priorityB = CATEGORY_PRIORITY[b.category] ?? 0;
      return priorityB - priorityA;
    });

    const seen = new Set<ToolCategory>();
    const diverse: ToolMetadata[] = [];

    for (const tool of sortedByPriority) {
      if (!seen.has(tool.category)) {
        diverse.push(tool);
        seen.add(tool.category);
      }
    }

    for (const tool of sortedByPriority) {
      if (!diverse.includes(tool)) {
        diverse.push(tool);
      }
    }

    return diverse.slice(0, 5);
  }

  private applyBoosts(tools: ToolMetadata[]): ToolMetadata[] {
    if (Object.keys(this.categoryBoosts).length === 0) {
      return tools;
    }

    const boosted = tools.map((tool, index) => {
      const baseScore = 1 - index * 0.1;
      const boost = this.categoryBoosts[tool.category] ?? 0;
      return { tool, score: baseScore + boost };
    });

    return boosted.sort((a, b) => b.score - a.score).map((b) => b.tool);
  }

  private calculateConfidence(tools: ToolMetadata[], query: string): number {
    if (tools.length === 0) {
      return 0;
    }

    const queryWords = query
      .toLowerCase()
      .split(WHITESPACE_REGEX)
      .filter(Boolean);
    const firstTool = tools[0];
    if (!firstTool) {
      return 0;
    }

    const toolText = `${firstTool.name} ${firstTool.description}`.toLowerCase();
    const matchCount = queryWords.filter((w) => toolText.includes(w)).length;
    const matchRatio =
      queryWords.length > 0 ? matchCount / queryWords.length : 0;

    const countBonus = Math.min(tools.length / 5, 0.2);

    return Math.min(matchRatio + countBonus, 1);
  }

  private generateReasoning(tools: ToolMetadata[], query: string): string {
    if (tools.length === 0) {
      return `No tools found matching "${query}"`;
    }

    const categories = [...new Set(tools.map((t) => t.category))];
    const topTool = tools[0];

    if (tools.length === 1 && topTool) {
      return `Found ${topTool.name} in ${topTool.category} category for "${query}"`;
    }

    return `Found ${tools.length} tools across ${categories.join(", ")} categories for "${query}"`;
  }

  private getToolSuggestionReason(
    tool: ToolMetadata,
    recentTools: string[]
  ): string {
    const recentCategories = new Set<ToolCategory>();
    for (const name of recentTools) {
      const meta = toolRegistry.getMetadata(name);
      if (meta) {
        recentCategories.add(meta.category);
      }
    }

    if (recentCategories.has(tool.category)) {
      return `Complements recent ${tool.category} tools`;
    }

    return `Commonly used ${tool.category} tool`;
  }
}

export const toolRouter = new ToolRouter();

export async function initializeToolRouter(
  config?: ToolRouterConfig
): Promise<ToolRouter> {
  const router = config ? new ToolRouter(config) : toolRouter;
  await router.initialize();
  return router;
}
