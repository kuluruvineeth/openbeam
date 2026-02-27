import type {
  MCPContent,
  MCPServerContext,
  MCPToolCall,
  MCPToolResult,
} from "@openplane/types/ai";
import type { z } from "zod";
import type { ToolRegistry } from "../tools/registry";
import type { RegisteredTool, ToolContext } from "../tools/types";
import type { MCPToolDefinition } from "./types";

export interface MCPToolListItem {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  pricing?: {
    amount: string;
    currency: string;
    network: string;
    description?: string;
  };
}

export function convertZodToJsonSchema(
  schema: z.ZodTypeAny
): Record<string, unknown> {
  if ("toJSONSchema" in schema && typeof schema.toJSONSchema === "function") {
    return schema.toJSONSchema() as Record<string, unknown>;
  }
  return { type: "object" };
}

export function registeredToolToMCPDefinition(
  registered: RegisteredTool
): MCPToolDefinition {
  const { metadata, coreTool } = registered;
  const inputSchema = (coreTool as unknown as { inputSchema?: z.ZodTypeAny })
    .inputSchema;

  return {
    name: metadata.name,
    description: metadata.description,
    inputSchema: inputSchema
      ? (inputSchema as z.ZodTypeAny)
      : ({} as z.ZodTypeAny),
    category: metadata.category,
    allowedCallers: metadata.allowedCallers,
  };
}

export function registeredToolToMCPListItem(
  registered: RegisteredTool
): MCPToolListItem {
  const { metadata, coreTool } = registered;
  const inputSchema = (coreTool as unknown as { inputSchema?: z.ZodTypeAny })
    .inputSchema;

  const item: MCPToolListItem = {
    name: metadata.name,
    description: metadata.description,
    inputSchema: inputSchema
      ? convertZodToJsonSchema(inputSchema as z.ZodTypeAny)
      : { type: "object" },
  };

  if (metadata.pricing) {
    item.pricing = {
      amount: metadata.pricing.amount,
      currency: metadata.pricing.currency,
      network: metadata.pricing.network,
      description: metadata.pricing.description,
    };
  }

  return item;
}

export function mcpContextToToolContext(
  mcpContext: MCPServerContext,
  services: ToolContext["services"]
): ToolContext {
  return {
    teamId: mcpContext.teamId,
    userId: mcpContext.userId ?? "",
    sessionId: mcpContext.sessionId,
    metadata: mcpContext.metadata,
    services,
  };
}

export function toolResultToMCPResult(result: unknown): MCPToolResult {
  if (isToolExecutionResult(result)) {
    if (result.success && result.data !== undefined) {
      return {
        content: [createTextContent(JSON.stringify(result.data, null, 2))],
        isError: false,
      };
    }

    return {
      content: [
        createTextContent(result.error?.message ?? "Tool execution failed"),
      ],
      isError: true,
    };
  }

  return {
    content: [createTextContent(JSON.stringify(result, null, 2))],
    isError: false,
  };
}

interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: { message: string };
}

function isToolExecutionResult(value: unknown): value is ToolExecutionResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "success" in value &&
    typeof (value as ToolExecutionResult).success === "boolean"
  );
}

function createTextContent(text: string): MCPContent {
  return { type: "text", text };
}

export class MCPToolBridge {
  private readonly registry: ToolRegistry;

  constructor(registry: ToolRegistry) {
    this.registry = registry;
  }

  listTools(caller: "mcp" = "mcp"): MCPToolListItem[] {
    const tools = this.registry.getAll();

    return tools
      .filter((tool) => {
        const allowedCallers = tool.metadata.allowedCallers;
        return !allowedCallers || allowedCallers.includes(caller);
      })
      .map(registeredToolToMCPListItem);
  }

  getToolDefinitions(caller: "mcp" = "mcp"): MCPToolDefinition[] {
    const tools = this.registry.getAll();

    return tools
      .filter((tool) => {
        const allowedCallers = tool.metadata.allowedCallers;
        return !allowedCallers || allowedCallers.includes(caller);
      })
      .map(registeredToolToMCPDefinition);
  }

  async executeTool(
    call: MCPToolCall,
    mcpContext: MCPServerContext
  ): Promise<MCPToolResult> {
    const registered = this.registry.get(call.name);
    if (!registered) {
      return {
        content: [createTextContent(`Tool not found: ${call.name}`)],
        isError: true,
      };
    }

    const allowedCallers = registered.metadata.allowedCallers;
    if (allowedCallers && !allowedCallers.includes("mcp")) {
      return {
        content: [
          createTextContent(`Tool ${call.name} is not available via MCP`),
        ],
        isError: true,
      };
    }

    const services = this.registry.getServices();
    const toolContext = mcpContextToToolContext(mcpContext, services);

    const startTime = performance.now();
    try {
      const execute = (
        registered.coreTool as {
          execute?: (args: unknown, options: unknown) => Promise<unknown>;
        }
      ).execute;
      if (!execute) {
        return {
          content: [
            createTextContent(`Tool ${call.name} has no execute function`),
          ],
          isError: true,
        };
      }

      const result = await execute(call.arguments, { context: toolContext });
      const durationMs = performance.now() - startTime;

      this.registry.notifyExecute(
        call.name,
        call.arguments,
        result,
        durationMs
      );

      return toolResultToMCPResult(result);
    } catch (error) {
      const durationMs = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      this.registry.notifyExecute(
        call.name,
        call.arguments,
        { success: false, error: { message: errorMessage } },
        durationMs
      );

      return {
        content: [createTextContent(`Tool execution error: ${errorMessage}`)],
        isError: true,
      };
    }
  }

  hasTool(name: string): boolean {
    const registered = this.registry.get(name);
    if (!registered) {
      return false;
    }

    const allowedCallers = registered.metadata.allowedCallers;
    return !allowedCallers || allowedCallers.includes("mcp");
  }
}

export function createMCPToolBridge(registry: ToolRegistry): MCPToolBridge {
  return new MCPToolBridge(registry);
}
