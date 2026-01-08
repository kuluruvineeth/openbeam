import { tool as createAITool } from "ai";
import { z } from "zod";
import { createUnimplementedServices, type ToolServices } from "./services";
import type {
  AISDKTool,
  RegisteredTool,
  ToolCategory,
  ToolContext,
  ToolMask,
  ToolMetadata,
  ToolRegistryOptions,
} from "./types";

class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool>();
  private _currentContext: ToolContext | null = null;
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

  constructor(options: ToolRegistryOptions = {}) {
    this.options = options;
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

    if (!this._currentContext) {
      return {
        teamId: "",
        userId: "",
        services,
        ...this.options.defaultContext,
      } as ToolContext;
    }

    return {
      ...this._currentContext,
      services,
    };
  }

  setCurrentContext(context: ToolContext): void {
    this._currentContext = context;
  }

  clearCurrentContext(): void {
    this._currentContext = null;
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
}

export const toolRegistry = new ToolRegistry();

export { ToolRegistry };

export { createAITool as tool };

export { z };
