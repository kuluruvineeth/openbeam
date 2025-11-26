/**
 * Tool Registry
 *
 * Central registry for AI tools with support for:
 * - Tool registration and discovery
 * - Execution with validation
 * - AI SDK integration
 * - MCP compatibility
 */

import type { CoreTool } from "ai";
import { tool as aiTool } from "ai";
import type {
  IToolRegistry,
  ToolCall,
  ToolCallResult,
  ToolCategory,
  ToolContext,
  ToolDefinition,
  ToolResult,
} from "./types";

/**
 * Tool Registry class
 */
export class ToolRegistry implements IToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  /**
   * Register a tool
   */
  register<TParams extends Record<string, unknown>, TResult>(
    tool: ToolDefinition<TParams, TResult>
  ): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool "${tool.name}" is being overwritten`);
    }
    this.tools.set(tool.name, tool as ToolDefinition);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): void {
    this.tools.delete(name);
  }

  /**
   * Get a tool by name
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * List all registered tools
   */
  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * List tools by category
   */
  listByCategory(category: ToolCategory): ToolDefinition[] {
    return this.list().filter((t) => t.category === category);
  }

  /**
   * Execute a tool
   */
  async execute(
    name: string,
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool "${name}" not found`,
      };
    }

    const startTime = Date.now();

    try {
      // Validate parameters
      const validated = tool.parameters.parse(params);

      // Execute tool
      const result = await tool.execute(validated, context);

      return {
        success: true,
        result,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Execute multiple tool calls
   */
  async executeMany(
    calls: ToolCall[],
    context: ToolContext
  ): Promise<ToolCallResult[]> {
    // Separate parallelizable and sequential tools
    const parallelizable: ToolCall[] = [];
    const sequential: ToolCall[] = [];

    for (const call of calls) {
      const tool = this.tools.get(call.name);
      if (tool?.parallelizable !== false) {
        parallelizable.push(call);
      } else {
        sequential.push(call);
      }
    }

    const results: ToolCallResult[] = [];

    // Execute parallelizable tools concurrently
    if (parallelizable.length > 0) {
      const parallelResults = await Promise.all(
        parallelizable.map(async (call) => ({
          toolCallId: call.id,
          name: call.name,
          result: await this.execute(call.name, call.arguments, context),
        }))
      );
      results.push(...parallelResults);
    }

    // Execute sequential tools in order
    for (const call of sequential) {
      const result = await this.execute(call.name, call.arguments, context);
      results.push({
        toolCallId: call.id,
        name: call.name,
        result,
      });
    }

    return results;
  }

  /**
   * Convert tools to AI SDK format
   */
  toAISDKTools(): Record<string, CoreTool> {
    const tools: Record<string, CoreTool> = {};

    for (const [name, def] of this.tools) {
      tools[name] = aiTool({
        description: def.description,
        parameters: def.parameters,
        execute: async (params) => {
          // This is a simplified execution - actual context would be provided by the caller
          const context: ToolContext = {
            teamId: "",
            userId: "",
          };
          const result = await this.execute(
            name,
            params as Record<string, unknown>,
            context
          );
          if (!result.success) {
            throw new Error(result.error);
          }
          return result.result;
        },
      });
    }

    return tools;
  }

  /**
   * Create tools for a specific context
   */
  createContextualTools(context: ToolContext): Record<string, CoreTool> {
    const tools: Record<string, CoreTool> = {};

    for (const [name, def] of this.tools) {
      tools[name] = aiTool({
        description: def.description,
        parameters: def.parameters,
        execute: async (params) => {
          const result = await this.execute(
            name,
            params as Record<string, unknown>,
            context
          );
          if (!result.success) {
            throw new Error(result.error);
          }
          return result.result;
        },
      });
    }

    return tools;
  }

  /**
   * Get tool descriptions for prompts
   */
  getToolDescriptions(): string {
    return this.list()
      .map((t) => `- ${t.name}: ${t.description}`)
      .join("\n");
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
  }
}

/**
 * Default tool registry instance
 */
export const toolRegistry = new ToolRegistry();

/**
 * Convenience function to register a tool
 */
export function registerTool<TParams extends Record<string, unknown>, TResult>(
  tool: ToolDefinition<TParams, TResult>
): void {
  toolRegistry.register(tool);
}

/**
 * Convenience function to create a tool definition
 */
export function defineTool<TParams extends Record<string, unknown>, TResult>(
  definition: ToolDefinition<TParams, TResult>
): ToolDefinition<TParams, TResult> {
  return definition;
}

export default toolRegistry;
