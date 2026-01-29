import { AsyncLocalStorage } from "node:async_hooks";
import type {
  ToolCategory,
  ToolExecutionResult,
  ToolMask,
  ToolMetadata,
} from "@openplane/types/ai";
import { tool as createAITool } from "ai";
import { z } from "zod";
import type { CompositionTracker } from "../observability/composition";
import { createUnimplementedServices, type ToolServices } from "./services";
import type {
  AISDKTool,
  RegisteredTool,
  ToolContext,
  ToolRegistryOptions,
} from "./types";

const contextStorage = new AsyncLocalStorage<ToolContext>();

export interface ToolSearchParams {
  query: string;
  category?: ToolCategory;
  limit?: number;
}

export interface MultiExecuteParams {
  tools: string[];
  inputs: unknown[];
  ctx: ToolContext;
  parallel?: boolean;
  maxConcurrency?: number;
}

export interface MultiExecuteResult {
  results: ToolExecutionResult[];
  totalLatencyMs: number;
  parallelized: boolean;
}

class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool>();
  private _boundServices: ToolServices = createUnimplementedServices();
  private readonly onExecuteCallbacks: Array<
    (
      tool: RegisteredTool,
      params: unknown,
      result: unknown,
      durationMs: number
    ) => void
  > = [];
  private readonly options: ToolRegistryOptions;
  private _compositionTracker: CompositionTracker | null = null;
  private _searchService: {
    search: (query: string) => Promise<ToolMetadata[]>;
  } | null = null;

  constructor(options: ToolRegistryOptions = {}) {
    this.options = options;
  }

  setCompositionTracker(tracker: CompositionTracker): void {
    this._compositionTracker = tracker;
  }

  getCompositionTracker(): CompositionTracker | null {
    return this._compositionTracker;
  }

  setSearchService(service: {
    search: (query: string) => Promise<ToolMetadata[]>;
  }): void {
    this._searchService = service;
  }

  bindServices(services: ToolServices): void {
    this._boundServices = services;
  }

  getServices(): ToolServices {
    return this._boundServices;
  }

  register(
    metadata: ToolMetadata,
    coreTool: AISDKTool,
    cacheKeyFn?: (params: unknown) => string
  ): void {
    this.tools.set(metadata.name, { metadata, coreTool, cacheKeyFn });
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  getTool(name: string): AISDKTool | undefined {
    return this.tools.get(name)?.coreTool;
  }

  getMetadata(name: string): ToolMetadata | undefined {
    return this.tools.get(name)?.metadata;
  }

  getAll(): RegisteredTool[] {
    return Array.from(this.tools.values());
  }

  getAllTools(): Record<string, AISDKTool> {
    const coreTools: Record<string, AISDKTool> = {};
    for (const [name, registered] of this.tools) {
      coreTools[name] = registered.coreTool;
    }
    return coreTools;
  }

  getByCategory(category: ToolCategory): RegisteredTool[] {
    return Array.from(this.tools.values()).filter(
      (t) => t.metadata.category === category
    );
  }

  getByCategoryTools(categories: ToolCategory[]): Record<string, AISDKTool> {
    const coreTools: Record<string, AISDKTool> = {};
    for (const [name, registered] of this.tools) {
      if (categories.includes(registered.metadata.category)) {
        coreTools[name] = registered.coreTool;
      }
    }
    return coreTools;
  }

  getAlwaysLoadedTools(): Record<string, AISDKTool> {
    const coreTools: Record<string, AISDKTool> = {};
    for (const [name, registered] of this.tools) {
      if (!registered.metadata.deferLoading) {
        coreTools[name] = registered.coreTool;
      }
    }
    return coreTools;
  }

  getDeferredTools(names: string[]): Record<string, AISDKTool> {
    const coreTools: Record<string, AISDKTool> = {};
    for (const name of names) {
      const registered = this.tools.get(name);
      if (registered?.metadata.deferLoading) {
        coreTools[name] = registered.coreTool;
      }
    }
    return coreTools;
  }

  getToolsWithMask(
    context: ToolContext,
    mask?: ToolMask
  ): Record<string, AISDKTool> {
    const coreTools: Record<string, AISDKTool> = {};

    for (const [name, registered] of this.tools) {
      if (registered.metadata.deferLoading && !mask?.loaded?.includes(name)) {
        continue;
      }

      if (mask?.disabled?.includes(name)) {
        continue;
      }

      if (!this.hasPermission(registered.metadata, context)) {
        continue;
      }

      coreTools[name] = registered.coreTool;
    }

    return coreTools;
  }

  getContextualTools(context: ToolContext): Record<string, AISDKTool> {
    return this.getToolsWithMask(context);
  }

  private hasPermission(metadata: ToolMetadata, context: ToolContext): boolean {
    if (!metadata.requiredPermissions?.length) {
      return true;
    }

    return metadata.requiredPermissions.every((perm) =>
      context.accessControl?.includes(perm)
    );
  }

  listNames(): string[] {
    return Array.from(this.tools.keys());
  }

  listDeferredNames(): string[] {
    return Array.from(this.tools.values())
      .filter((t) => t.metadata.deferLoading)
      .map((t) => t.metadata.name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  clear(): void {
    this.tools.clear();
  }

  size(): number {
    return this.tools.size;
  }

  getCurrentContext(): ToolContext {
    const services = this._boundServices;
    const storedContext = contextStorage.getStore();

    if (!storedContext) {
      return {
        teamId: "",
        userId: "",
        services,
        ...this.options.defaultContext,
      } as ToolContext;
    }

    return {
      ...storedContext,
      services,
    };
  }

  setCurrentContext(context: ToolContext): void {
    contextStorage.enterWith(context);
  }

  clearCurrentContext(): void {
    contextStorage.enterWith(undefined as unknown as ToolContext);
  }

  runWithContext<T>(context: ToolContext, fn: () => T): T {
    return contextStorage.run(context, fn);
  }

  runWithContextAsync<T>(
    context: ToolContext,
    fn: () => Promise<T>
  ): Promise<T> {
    return contextStorage.run(context, fn);
  }

  onExecute(
    callback: (
      tool: RegisteredTool,
      params: unknown,
      result: unknown,
      durationMs: number
    ) => void
  ): () => void {
    this.onExecuteCallbacks.push(callback);
    return () => {
      const index = this.onExecuteCallbacks.indexOf(callback);
      if (index > -1) {
        this.onExecuteCallbacks.splice(index, 1);
      }
    };
  }

  notifyExecute(
    toolName: string,
    params: unknown,
    result: unknown,
    durationMs: number
  ): void {
    const registered = this.tools.get(toolName);
    if (registered) {
      for (const callback of this.onExecuteCallbacks) {
        callback(registered, params, result, durationMs);
      }
    }
  }

  getAllMetadata(): ToolMetadata[] {
    return Array.from(this.tools.values()).map((t) => t.metadata);
  }

  getToolNamesForPrompt(): string[] {
    return Array.from(this.tools.values())
      .filter((t) => !t.metadata.deferLoading)
      .map((t) => t.metadata.name);
  }

  getToolNamesWithDescriptions(): Array<{ name: string; description: string }> {
    return Array.from(this.tools.values())
      .filter((t) => !t.metadata.deferLoading)
      .map((t) => ({
        name: t.metadata.name,
        description:
          t.metadata.description.split("\n")[0] ?? t.metadata.description,
      }));
  }

  getToolInfo(name: string): {
    name: string;
    description: string;
    category: string;
    inputSchema: unknown;
  } | null {
    const registered = this.tools.get(name);
    if (!registered) {
      return null;
    }

    const tool = registered.coreTool as { inputSchema?: unknown };

    return {
      name: registered.metadata.name,
      description: registered.metadata.description,
      category: registered.metadata.category,
      inputSchema: tool.inputSchema,
    };
  }

  async search(params: ToolSearchParams): Promise<ToolMetadata[]> {
    const { query, category, limit = 5 } = params;

    if (this._searchService) {
      const results = await this._searchService.search(query);
      let filtered = results;

      if (category) {
        filtered = results.filter((t) => t.category === category);
      }

      return filtered.slice(0, limit);
    }

    let candidates = Array.from(this.tools.values()).map((t) => t.metadata);

    if (category) {
      candidates = candidates.filter((t) => t.category === category);
    }

    const queryLower = query.toLowerCase();
    const scored = candidates.map((tool) => {
      const nameMatch = tool.name.toLowerCase().includes(queryLower) ? 3 : 0;
      const descMatch = tool.description.toLowerCase().includes(queryLower)
        ? 2
        : 0;
      const keywordMatch = tool.searchKeywords?.some((k) =>
        k.toLowerCase().includes(queryLower)
      )
        ? 1
        : 0;
      return { tool, score: nameMatch + descMatch + keywordMatch };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.tool);
  }

  async multiExecute(params: MultiExecuteParams): Promise<MultiExecuteResult> {
    const { tools, inputs, ctx, parallel = true, maxConcurrency = 5 } = params;
    const startTime = performance.now();

    if (tools.length !== inputs.length) {
      throw new Error(
        `Tool count (${tools.length}) must match input count (${inputs.length})`
      );
    }

    if (tools.length === 0) {
      return { results: [], totalLatencyMs: 0, parallelized: parallel };
    }

    const results = parallel
      ? await this.executeParallel(tools, inputs, ctx, maxConcurrency)
      : await this.executeSequential(tools, inputs, ctx);

    return {
      results,
      totalLatencyMs: performance.now() - startTime,
      parallelized: parallel,
    };
  }

  private async executeSequential(
    tools: string[],
    inputs: unknown[],
    ctx: ToolContext
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];
    for (let i = 0; i < tools.length; i++) {
      const toolName = tools[i];
      if (toolName !== undefined) {
        results.push(await this.executeSingleTool(toolName, inputs[i], ctx));
      }
    }
    return results;
  }

  private async executeParallel(
    tools: string[],
    inputs: unknown[],
    ctx: ToolContext,
    maxConcurrency: number
  ): Promise<ToolExecutionResult[]> {
    const chunks = this.createExecutionChunks(tools, inputs, maxConcurrency);
    const results = new Array<ToolExecutionResult>(tools.length);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(async ({ name, input, index }) => ({
          index,
          result: await this.executeSingleTool(name, input, ctx),
        }))
      );

      for (const { index, result } of chunkResults) {
        results[index] = result;
      }
    }

    return results;
  }

  private createExecutionChunks(
    tools: string[],
    inputs: unknown[],
    maxConcurrency: number
  ): Array<Array<{ name: string; input: unknown; index: number }>> {
    const chunks: Array<
      Array<{ name: string; input: unknown; index: number }>
    > = [];

    for (let i = 0; i < tools.length; i += maxConcurrency) {
      const chunk: Array<{ name: string; input: unknown; index: number }> = [];
      const end = Math.min(i + maxConcurrency, tools.length);

      for (let j = i; j < end; j++) {
        const name = tools[j];
        if (name !== undefined) {
          chunk.push({ name, input: inputs[j], index: j });
        }
      }

      chunks.push(chunk);
    }

    return chunks;
  }

  private async executeSingleTool(
    toolName: string,
    input: unknown,
    ctx: ToolContext
  ): Promise<ToolExecutionResult> {
    const registered = this.tools.get(toolName);
    if (!registered) {
      return {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Tool "${toolName}" not found`,
          retryable: false,
        },
      };
    }

    const coreTool = registered.coreTool as {
      execute?: (
        params: unknown,
        options: { abortSignal?: AbortSignal }
      ) => Promise<ToolExecutionResult>;
    };

    if (!coreTool.execute) {
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: `Tool "${toolName}" has no execute function`,
          retryable: false,
        },
      };
    }

    this._compositionTracker?.recordToolCall(toolName);

    return await coreTool.execute(input, { abortSignal: ctx.abortSignal });
  }

  findByCapability(capability: string): ToolMetadata[] {
    const capLower = capability.toLowerCase();
    return Array.from(this.tools.values())
      .map((t) => t.metadata)
      .filter((m) => this.matchesCapability(m, capLower));
  }

  private matchesCapability(m: ToolMetadata, capLower: string): boolean {
    if (m.name.toLowerCase().includes(capLower)) {
      return true;
    }
    if (m.description.toLowerCase().includes(capLower)) {
      return true;
    }
    if (m.searchKeywords?.some((k) => k.toLowerCase().includes(capLower))) {
      return true;
    }
    return false;
  }

  suggestTools(context: {
    query?: string;
    recentTools?: string[];
  }): ToolMetadata[] {
    const all = Array.from(this.tools.values()).map((t) => t.metadata);
    const defaultTools = all.filter((t) => !t.deferLoading).slice(0, 5);

    const recentTools = context.recentTools;
    if (!recentTools || recentTools.length === 0) {
      return defaultTools;
    }

    const recentCategories = new Set<ToolCategory>();
    for (const name of recentTools) {
      const meta = this.tools.get(name)?.metadata;
      if (meta) {
        recentCategories.add(meta.category);
      }
    }

    const sameCategoryTools = all.filter(
      (t) => recentCategories.has(t.category) && !recentTools.includes(t.name)
    );

    if (sameCategoryTools.length > 0) {
      return sameCategoryTools.slice(0, 5);
    }

    return defaultTools;
  }
}

export const toolRegistry = new ToolRegistry();

export { ToolRegistry };

export { createAITool as tool };

export { z };
