import type { Tool } from "ai";
import type { z } from "zod";

export type ToolCategory =
  | "search"
  | "data"
  | "action"
  | "analysis"
  | "communication"
  | "integration"
  | "utility";

export interface ToolContext {
  teamId: string;
  userId: string;
  accessControl?: string[];
  conversationId?: string;
  executionId?: string;
  abortSignal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

export type AISDKTool = Tool;

export interface ToolMetadata {
  name: string;
  category: ToolCategory;
  enabledByDefault?: boolean;
  requiredPermissions?: string[];
}

export interface RegisteredTool {
  metadata: ToolMetadata;
  coreTool: AISDKTool;
}

export interface ToolRegistryOptions {
  defaultContext?: Partial<ToolContext>;
}

export interface ToolBuilderOptions<
  TSchema extends z.ZodObject<z.ZodRawShape>,
  TResult,
> {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: TSchema;
  execute: (
    params: z.output<TSchema>,
    context: ToolContext
  ) => Promise<TResult>;
  enabledByDefault?: boolean;
  requiredPermissions?: string[];
}
