import type { ModelMessage } from "ai";
import { type CacheOptimizer, createCacheOptimizer } from "./cache-hints";
import {
  type CompactionConfig,
  type ContextEvent,
  compactContext,
  shouldCompact,
} from "./compaction";
import { estimateTokenCount } from "./estimator";
import { type ContextManager, createContextManager } from "./manager";
import {
  buildContextMessages,
  type MessageBuilderOptions,
} from "./message-builder";
import {
  createObjectiveTracker,
  type Objective,
  type ObjectiveTracker,
} from "./objectives";
import type { ContextManagerOptions } from "./types";
import {
  createVirtualFileStore,
  type VirtualFileStore,
  type VirtualFileStoreOptions,
} from "./virtual-files";

export interface ContextOrchestratorOptions {
  maxTokens?: number;
  reserveTokens?: number;
  compactionThreshold?: number;
  virtualFileThreshold?: number;
  observationMaskingEnabled?: boolean;
  autoCompactionEnabled?: boolean;
  recitationInterval?: number;
  includeContextMd?: boolean;
}

export interface OrchestratorState {
  events: ContextEvent[];
  objectives: Objective[];
  totalTokens: number;
  utilizationPercent: number;
  maskedObservationCount: number;
  virtualFileCount: number;
  compactionCount: number;
}

const DEFAULT_MAX_TOKENS = 128_000;
const DEFAULT_RESERVE_TOKENS = 4096;
const DEFAULT_COMPACTION_THRESHOLD = 0.7;
const DEFAULT_VIRTUAL_FILE_THRESHOLD = 2000;
const DEFAULT_RECITATION_INTERVAL = 5;

export class ContextOrchestrator {
  private readonly contextManager: ContextManager;
  private readonly virtualFileStore: VirtualFileStore;
  private readonly objectiveTracker: ObjectiveTracker;
  private readonly cacheOptimizer: CacheOptimizer;

  private readonly maxTokens: number;
  private readonly reserveTokens: number;
  private readonly compactionThreshold: number;
  private readonly virtualFileThreshold: number;
  private readonly autoCompactionEnabled: boolean;

  private events: ContextEvent[] = [];
  private eventCounter = 0;
  private compactionCount = 0;
  private systemPrompt = "";
  private toolDefinitions = "";

  constructor(options: ContextOrchestratorOptions = {}) {
    this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
    this.reserveTokens = options.reserveTokens ?? DEFAULT_RESERVE_TOKENS;
    this.compactionThreshold =
      options.compactionThreshold ?? DEFAULT_COMPACTION_THRESHOLD;
    this.virtualFileThreshold =
      options.virtualFileThreshold ?? DEFAULT_VIRTUAL_FILE_THRESHOLD;
    this.autoCompactionEnabled = options.autoCompactionEnabled ?? true;

    const contextManagerOptions: ContextManagerOptions = {
      maxTokens: this.maxTokens,
      reserveTokens: this.reserveTokens,
      autoMaskThreshold: this.compactionThreshold,
      largeObservationThreshold: this.virtualFileThreshold,
      summarizeLargeObservations: options.observationMaskingEnabled ?? true,
    };

    const virtualFileOptions: VirtualFileStoreOptions = {
      maxFiles: 50,
      maxTotalTokens: this.maxTokens,
      previewLength: 200,
    };

    this.contextManager = createContextManager(contextManagerOptions);
    this.virtualFileStore = createVirtualFileStore(virtualFileOptions);
    this.objectiveTracker = createObjectiveTracker({
      recitationInterval:
        options.recitationInterval ?? DEFAULT_RECITATION_INTERVAL,
    });
    this.cacheOptimizer = createCacheOptimizer();
  }

  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  setToolDefinitions(definitions: string): void {
    this.toolDefinitions = definitions;
  }

  addUserMessage(content: string): string {
    return this.addEvent("user_message", content);
  }

  addAssistantMessage(content: string): string {
    return this.addEvent("assistant_message", content);
  }

  addToolCall(toolName: string, args: Record<string, unknown>): string {
    const id = this.addEvent("tool_call", JSON.stringify(args), { toolName });
    return id;
  }

  addToolResult(
    toolName: string,
    result: string,
    toolCallId?: string
  ): { eventId: string; virtualized: boolean; fileId?: string } {
    const tokens = estimateTokenCount(result);

    if (tokens > this.virtualFileThreshold) {
      const fileRef = this.virtualFileStore.store(`${toolName}_output`, result);
      const summary = `[Virtual File: ${fileRef.fileId}] ${toolName} returned ${tokens} tokens. Preview: ${fileRef.preview}`;

      const eventId = this.addEvent("tool_result", summary, {
        toolName,
        toolCallId,
      });

      this.contextManager.addObservation(toolName, summary, summary);

      return { eventId, virtualized: true, fileId: fileRef.fileId };
    }

    const eventId = this.addEvent("tool_result", result, {
      toolName,
      toolCallId,
    });
    this.contextManager.addObservation(toolName, result);

    return { eventId, virtualized: false };
  }

  addObjective(content: string, priority = 1): string {
    return this.objectiveTracker.add(content, priority);
  }

  startObjective(id: string): void {
    this.objectiveTracker.markInProgress(id);
  }

  completeObjective(id: string): void {
    this.objectiveTracker.markCompleted(id);
  }

  blockObjective(id: string, reason: string): void {
    this.objectiveTracker.markBlocked(id, reason);
  }

  async buildMessages(memoryContext?: string): Promise<ModelMessage[]> {
    await this.maybeCompact();

    const recitation = this.objectiveTracker.shouldRecite()
      ? this.objectiveTracker.generateRecitation()
      : undefined;

    const options: MessageBuilderOptions = {
      systemPrompt: this.systemPrompt,
      toolDefinitions: this.toolDefinitions || undefined,
      memoryContext,
      virtualFiles: this.virtualFileStore.listReferences(),
      objectives: this.objectiveTracker.getAll(),
      events: this.events,
      cacheConfig: {
        cacheSystemPrompt: true,
        cacheToolDefs: true,
        cacheMemory: true,
      },
    };

    const result = buildContextMessages(options);

    if (recitation) {
      result.messages.push({
        role: "assistant",
        content: recitation,
      });
    }

    return result.messages;
  }

  async compact(config?: CompactionConfig): Promise<void> {
    const result = await compactContext(this.events, {
      preserveRecentCount: config?.preserveRecentCount ?? 5,
      maxSummaryTokens: config?.maxSummaryTokens ?? 2000,
      model: config?.model,
    });

    this.events = result.preservedEvents;
    this.compactionCount += 1;
  }

  recordStep(): void {
    this.objectiveTracker.recordStep();
  }

  getState(): OrchestratorState {
    const totalTokens = this.calculateTotalTokens();
    const effectiveMax = this.maxTokens - this.reserveTokens;

    return {
      events: [...this.events],
      objectives: this.objectiveTracker.getAll(),
      totalTokens,
      utilizationPercent: totalTokens / effectiveMax,
      maskedObservationCount:
        this.contextManager.getMaskedObservations().length,
      virtualFileCount: this.virtualFileStore.getFileCount(),
      compactionCount: this.compactionCount,
    };
  }

  getVirtualFileStore(): VirtualFileStore {
    return this.virtualFileStore;
  }

  getObjectiveTracker(): ObjectiveTracker {
    return this.objectiveTracker;
  }

  getContextManager(): ContextManager {
    return this.contextManager;
  }

  getCacheOptimizer(): CacheOptimizer {
    return this.cacheOptimizer;
  }

  reset(): void {
    this.events = [];
    this.eventCounter = 0;
    this.compactionCount = 0;
    this.contextManager.reset();
    this.virtualFileStore.clear();
    this.objectiveTracker.clear();
  }

  private addEvent(
    type: ContextEvent["type"],
    content: string,
    metadata?: Partial<ContextEvent["metadata"]>
  ): string {
    this.eventCounter += 1;
    const id = `evt_${this.eventCounter}_${Date.now()}`;

    this.events.push({
      id,
      type,
      content,
      timestamp: Date.now(),
      metadata,
    });

    return id;
  }

  private async maybeCompact(): Promise<void> {
    if (!this.autoCompactionEnabled) {
      return;
    }

    const effectiveMax = this.maxTokens - this.reserveTokens;
    if (shouldCompact(this.events, effectiveMax, this.compactionThreshold)) {
      await this.compact();
    }
  }

  private calculateTotalTokens(): number {
    let total = estimateTokenCount(this.systemPrompt);
    total += estimateTokenCount(this.toolDefinitions);

    for (const event of this.events) {
      total += estimateTokenCount(event.content);
    }

    return total;
  }
}

export function createContextOrchestrator(
  options?: ContextOrchestratorOptions
): ContextOrchestrator {
  return new ContextOrchestrator(options);
}
