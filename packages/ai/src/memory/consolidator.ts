import type {
  ConsolidatedMemory,
  EpisodicEntry,
  MemoryConsolidatorOptions,
  MemoryQuery,
  ProceduralEntry,
  ScoredMemoryEntry,
  SemanticEntry,
} from "@openplane/types/ai";
import {
  createEpisodicMemory,
  type EpisodicMemory,
  type EpisodicMemoryOptions,
} from "./episodic";
import {
  createProceduralMemory,
  type ProceduralMemory,
  type ProceduralMemoryOptions,
} from "./procedural";
import {
  createSemanticMemory,
  type SemanticMemory,
  type SemanticMemoryOptions,
} from "./semantic";
import { DEFAULT_CONSOLIDATION_OPTIONS } from "./types";

export interface MemorySystemOptions {
  episodic?: EpisodicMemoryOptions;
  semantic?: SemanticMemoryOptions;
  procedural?: ProceduralMemoryOptions;
  consolidation?: MemoryConsolidatorOptions;
}

interface UnifiedRetrievalResult {
  episodic: ScoredMemoryEntry[];
  semantic: ScoredMemoryEntry[];
  procedural: ScoredMemoryEntry[];
  combined: ScoredMemoryEntry[];
  queryTime: number;
}

export class MemoryConsolidator {
  readonly episodic: EpisodicMemory;
  readonly semantic: SemanticMemory;
  readonly procedural: ProceduralMemory;
  private readonly options: Required<MemoryConsolidatorOptions>;

  constructor(systemOptions: MemorySystemOptions = {}) {
    this.episodic = createEpisodicMemory(systemOptions.episodic);
    this.semantic = createSemanticMemory(systemOptions.semantic);
    this.procedural = createProceduralMemory(systemOptions.procedural);

    this.options = {
      ...DEFAULT_CONSOLIDATION_OPTIONS,
      ...systemOptions.consolidation,
    };
  }

  async retrieve(query: MemoryQuery): Promise<UnifiedRetrievalResult> {
    const startTime = performance.now();

    const targetTypes = query.types ?? ["episodic", "semantic", "procedural"];

    const [episodicResult, semanticResult, proceduralResult] =
      await Promise.all([
        targetTypes.includes("episodic")
          ? this.episodic.retrieve(query)
          : Promise.resolve({ entries: [], totalCount: 0, queryTime: 0 }),
        targetTypes.includes("semantic")
          ? this.semantic.retrieve(query)
          : Promise.resolve({ entries: [], totalCount: 0, queryTime: 0 }),
        targetTypes.includes("procedural")
          ? this.procedural.retrieve(query)
          : Promise.resolve({ entries: [], totalCount: 0, queryTime: 0 }),
      ]);

    const combined = this.rankAndMerge(
      episodicResult.entries,
      semanticResult.entries,
      proceduralResult.entries,
      query.limit ?? 20
    );

    return {
      episodic: episodicResult.entries,
      semantic: semanticResult.entries,
      procedural: proceduralResult.entries,
      combined,
      queryTime: performance.now() - startTime,
    };
  }

  async consolidate(query: MemoryQuery): Promise<ConsolidatedMemory> {
    const result = await this.retrieve(query);
    const tokenBudget = this.options.maxTokens;

    const episodicBudget = Math.floor(
      tokenBudget * this.options.episodicWeight
    );
    const semanticBudget = Math.floor(
      tokenBudget * this.options.semanticWeight
    );
    const proceduralBudget = Math.floor(
      tokenBudget * this.options.proceduralWeight
    );

    const episodicText = this.formatEpisodicEntries(
      result.episodic,
      episodicBudget
    );
    const semanticText = this.formatSemanticEntries(
      result.semantic,
      semanticBudget
    );
    const proceduralText = this.formatProceduralEntries(
      result.procedural,
      proceduralBudget
    );

    const combined = this.buildCombinedContext(
      episodicText,
      semanticText,
      proceduralText
    );

    return {
      episodic: episodicText,
      semantic: semanticText,
      procedural: proceduralText,
      combined,
      tokenCount: this.estimateTokens(combined),
      entryCount:
        result.episodic.length +
        result.semantic.length +
        result.procedural.length,
    };
  }

  async storeConversationTurn(
    input: string,
    output: string,
    metadata: {
      teamId: string;
      userId?: string;
      sessionId: string;
      turnNumber: number;
    }
  ): Promise<{ inputId: string; outputId: string }> {
    const timestamp = Date.now();

    const inputId = await this.episodic.store({
      type: "episodic",
      content: input,
      timestamp,
      eventType: "query",
      metadata: {
        teamId: metadata.teamId,
        userId: metadata.userId,
        sessionId: metadata.sessionId,
      },
      turnNumber: metadata.turnNumber,
    });

    const outputId = await this.episodic.store({
      type: "episodic",
      content: output,
      timestamp: timestamp + 1,
      eventType: "response",
      metadata: {
        teamId: metadata.teamId,
        userId: metadata.userId,
        sessionId: metadata.sessionId,
      },
      turnNumber: metadata.turnNumber,
      parentId: inputId,
    });

    return { inputId, outputId };
  }

  // biome-ignore lint/nursery/useMaxParams: Legacy API signature
  storeToolCall(
    toolName: string,
    input: unknown,
    output: unknown,
    success: boolean,
    metadata: {
      teamId: string;
      userId?: string;
      sessionId: string;
    }
  ): Promise<string> {
    const content = JSON.stringify({ toolName, input, output, success });

    return this.episodic.store({
      type: "episodic",
      content,
      timestamp: Date.now(),
      eventType: success ? "tool_result" : "error",
      metadata: {
        teamId: metadata.teamId,
        userId: metadata.userId,
        sessionId: metadata.sessionId,
        tags: [`tool:${toolName}`],
      },
    });
  }

  learnFact(
    content: string,
    category: string,
    sources: string[],
    metadata: {
      teamId: string;
      userId?: string;
      confidence?: number;
      validUntil?: number;
    }
  ): Promise<string> {
    return this.semantic.store({
      type: "semantic",
      content,
      category,
      sources,
      confidence: metadata.confidence ?? 0.7,
      validUntil: metadata.validUntil,
      timestamp: Date.now(),
      metadata: {
        teamId: metadata.teamId,
        userId: metadata.userId,
      },
    });
  }

  learnProcedure(
    pattern: string,
    trigger: string,
    action: string,
    metadata: {
      teamId: string;
      userId?: string;
      initialSuccessRate?: number;
    }
  ): Promise<string> {
    return this.procedural.store({
      type: "procedural",
      content: `${trigger} -> ${action}`,
      pattern,
      trigger,
      action,
      successRate: metadata.initialSuccessRate ?? 0.5,
      executionCount: 0,
      timestamp: Date.now(),
      metadata: {
        teamId: metadata.teamId,
        userId: metadata.userId,
        tags: [`pattern:${pattern}`],
      },
    });
  }

  async recordProcedureOutcome(
    procedureId: string,
    success: boolean
  ): Promise<void> {
    await this.procedural.recordExecution(procedureId, success);
  }

  async getSessionContext(
    sessionId: string,
    teamId: string,
    maxTurns = 10
  ): Promise<string> {
    const history = await this.episodic.getSessionHistory(sessionId);

    const filtered = history.filter((e) => e.metadata.teamId === teamId);
    const recent = filtered.slice(-maxTurns * 2);

    return recent
      .map((entry) => {
        const role = entry.eventType === "query" ? "User" : "Assistant";
        return `${role}: ${entry.content}`;
      })
      .join("\n\n");
  }

  suggestAction(
    trigger: string,
    teamId: string
  ): Promise<{ action: string; confidence: number } | null> {
    return this.procedural.suggestAction(trigger, teamId);
  }

  async getRelevantKnowledge(
    query: string,
    teamId: string,
    categories?: string[]
  ): Promise<SemanticEntry[]> {
    const result = await this.semantic.retrieve({
      query,
      teamId,
      types: ["semantic"],
      limit: 10,
    });

    let entries = result.entries.map((e) => e.entry as SemanticEntry);

    if (categories?.length) {
      entries = entries.filter((e) => categories.includes(e.category));
    }

    return entries;
  }

  applyDecay(): void {
    this.episodic.applyDecay();
    this.semantic.applyDecay();
    this.procedural.applyDecay();
  }

  async clearTeamMemory(teamId: string): Promise<{
    episodic: number;
    semantic: number;
    procedural: number;
  }> {
    const filter = { teamId };

    const [episodicCount, semanticCount, proceduralCount] = await Promise.all([
      this.episodic.clear(filter),
      this.semantic.clear(filter),
      this.procedural.clear(filter),
    ]);

    return {
      episodic: episodicCount,
      semantic: semanticCount,
      procedural: proceduralCount,
    };
  }

  async getStats(teamId: string): Promise<{
    episodic: number;
    semantic: number;
    procedural: number;
    total: number;
  }> {
    const filter = { teamId };

    const [episodicCount, semanticCount, proceduralCount] = await Promise.all([
      this.episodic.count(filter),
      this.semantic.count(filter),
      this.procedural.count(filter),
    ]);

    return {
      episodic: episodicCount,
      semantic: semanticCount,
      procedural: proceduralCount,
      total: episodicCount + semanticCount + proceduralCount,
    };
  }

  private rankAndMerge(
    episodic: ScoredMemoryEntry[],
    semantic: ScoredMemoryEntry[],
    procedural: ScoredMemoryEntry[],
    limit: number
  ): ScoredMemoryEntry[] {
    const all: Array<{ entry: ScoredMemoryEntry; weight: number }> = [];

    for (const e of episodic) {
      all.push({ entry: e, weight: this.options.episodicWeight });
    }
    for (const s of semantic) {
      all.push({ entry: s, weight: this.options.semanticWeight });
    }
    for (const p of procedural) {
      all.push({ entry: p, weight: this.options.proceduralWeight });
    }

    all.sort((a, b) => {
      const scoreA = this.calculateMergedScore(a.entry, a.weight);
      const scoreB = this.calculateMergedScore(b.entry, b.weight);
      return scoreB - scoreA;
    });

    return all.slice(0, limit).map((a) => a.entry);
  }

  private calculateMergedScore(
    entry: ScoredMemoryEntry,
    typeWeight: number
  ): number {
    const recencyBonus = entry.recencyScore * this.options.recencyBias;
    const importanceBonus = entry.importanceScore * this.options.importanceBias;
    return entry.combinedScore * typeWeight + recencyBonus + importanceBonus;
  }

  private formatEpisodicEntries(
    entries: ScoredMemoryEntry[],
    tokenBudget: number
  ): string {
    if (entries.length === 0) {
      return "";
    }

    const header = "## Recent Interactions\n";
    const parts: string[] = [header];
    let tokens = this.estimateTokens(header);

    for (const { entry } of entries) {
      const episodic = entry as EpisodicEntry;
      const role = episodic.eventType === "query" ? "User" : "Assistant";
      const line = `${role}: ${episodic.content}\n`;
      const lineTokens = this.estimateTokens(line);

      if (tokens + lineTokens > tokenBudget) {
        break;
      }

      parts.push(line);
      tokens += lineTokens;
    }

    return parts.join("");
  }

  private formatSemanticEntries(
    entries: ScoredMemoryEntry[],
    tokenBudget: number
  ): string {
    if (entries.length === 0) {
      return "";
    }

    const header = "## Relevant Knowledge\n";
    const parts: string[] = [header];
    let tokens = this.estimateTokens(header);

    const byCategory = new Map<string, SemanticEntry[]>();
    for (const { entry } of entries) {
      const semantic = entry as SemanticEntry;
      const categoryEntries = byCategory.get(semantic.category) ?? [];
      categoryEntries.push(semantic);
      byCategory.set(semantic.category, categoryEntries);
    }

    for (const [category, categoryEntries] of byCategory) {
      const categoryHeader = `### ${category}\n`;
      const headerTokens = this.estimateTokens(categoryHeader);

      if (tokens + headerTokens > tokenBudget) {
        break;
      }

      parts.push(categoryHeader);
      tokens += headerTokens;

      for (const semantic of categoryEntries) {
        const line = `- ${semantic.content} (confidence: ${(semantic.confidence * 100).toFixed(0)}%)\n`;
        const lineTokens = this.estimateTokens(line);

        if (tokens + lineTokens > tokenBudget) {
          break;
        }

        parts.push(line);
        tokens += lineTokens;
      }
    }

    return parts.join("");
  }

  private formatProceduralEntries(
    entries: ScoredMemoryEntry[],
    tokenBudget: number
  ): string {
    if (entries.length === 0) {
      return "";
    }

    const header = "## Learned Patterns\n";
    const parts: string[] = [header];
    let tokens = this.estimateTokens(header);

    for (const { entry } of entries) {
      const procedural = entry as ProceduralEntry;
      const line = `- When "${procedural.trigger}" → ${procedural.action} (success: ${(procedural.successRate * 100).toFixed(0)}%, used ${procedural.executionCount}x)\n`;
      const lineTokens = this.estimateTokens(line);

      if (tokens + lineTokens > tokenBudget) {
        break;
      }

      parts.push(line);
      tokens += lineTokens;
    }

    return parts.join("");
  }

  private buildCombinedContext(
    episodic: string,
    semantic: string,
    procedural: string
  ): string {
    const parts: string[] = [];

    if (semantic) {
      parts.push(semantic);
    }
    if (procedural) {
      parts.push(procedural);
    }
    if (episodic) {
      parts.push(episodic);
    }

    return parts.join("\n---\n\n");
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

export function createMemoryConsolidator(
  options?: MemorySystemOptions
): MemoryConsolidator {
  return new MemoryConsolidator(options);
}
