import { tool } from "ai";
import { z } from "zod";
import type {
  AISDKTool,
  RegisteredTool,
  ToolCategory,
  ToolContext,
  ToolMetadata,
  ToolRegistryOptions,
} from "./types";

class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool>();
  private _defaultContext: Partial<ToolContext> = {};

  constructor(options: ToolRegistryOptions = {}) {
    if (options.defaultContext) {
      this._defaultContext = options.defaultContext;
    }
  }

  get defaultContext(): Partial<ToolContext> {
    return this._defaultContext;
  }

  /**
   * Register a pre-built tool with its metadata
   */
  register(metadata: ToolMetadata, coreTool: AISDKTool): void {
    this.tools.set(metadata.name, { metadata, coreTool });
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

  getEnabled(): RegisteredTool[] {
    return Array.from(this.tools.values()).filter(
      (t) => t.metadata.enabledByDefault !== false
    );
  }

  getEnabledTools(): Record<string, AISDKTool> {
    const coreTools: Record<string, AISDKTool> = {};
    for (const [name, registered] of this.tools) {
      if (registered.metadata.enabledByDefault !== false) {
        coreTools[name] = registered.coreTool;
      }
    }
    return coreTools;
  }

  getContextualTools(context: ToolContext): Record<string, AISDKTool> {
    const contextualTools: Record<string, AISDKTool> = {};

    for (const [name, registered] of this.tools) {
      if (registered.metadata.enabledByDefault === false) {
        continue;
      }

      if (registered.metadata.requiredPermissions?.length) {
        const hasPermission = registered.metadata.requiredPermissions.every(
          (perm) => context.accessControl?.includes(perm)
        );
        if (!hasPermission) {
          continue;
        }
      }

      contextualTools[name] = registered.coreTool;
    }

    return contextualTools;
  }

  listNames(): string[] {
    return Array.from(this.tools.keys());
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  clear(): void {
    this.tools.clear();
  }

  setDefaultContext(context: Partial<ToolContext>): void {
    this._defaultContext = context;
  }
}

export const toolRegistry = new ToolRegistry();

export { ToolRegistry };

export { tool };

export { z };
