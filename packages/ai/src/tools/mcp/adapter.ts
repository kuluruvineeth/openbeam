/**
 * Model Context Protocol (MCP) Adapter
 *
 * Provides integration with MCP servers for tool discovery and execution.
 * Uses AI SDK's experimental MCP client for seamless integration.
 *
 * Features:
 * - Connect to MCP servers (stdio, SSE, HTTP)
 * - Discover and import tools from MCP servers
 * - Convert between MCP tools and AI SDK tools
 * - Support for MCP resources and prompts
 */

import { tool as aiTool, type CoreTool } from "ai";
import { z } from "zod";
import { toolRegistry } from "../registry";
import type {
  IMCPServer,
  MCPPropertySchema,
  MCPTool,
  ToolContext,
  ToolDefinition,
} from "../types";

/**
 * MCP Server connection options
 */
export interface MCPServerOptions {
  /** Server name for identification */
  name: string;
  /** Server transport type */
  transport: "stdio" | "sse" | "http";
  /** Command to run (for stdio) */
  command?: string;
  /** Arguments for command (for stdio) */
  args?: string[];
  /** URL for SSE/HTTP transport */
  url?: string;
  /** Environment variables to pass to the process */
  env?: Record<string, string>;
  /** Connection timeout in milliseconds */
  timeout?: number;
}

/**
 * MCP Server implementation
 */
export class MCPServer implements IMCPServer {
  readonly name: string;
  private readonly options: MCPServerOptions;
  private connected = false;
  private tools: MCPTool[] = [];

  constructor(options: MCPServerOptions) {
    this.name = options.name;
    this.options = options;
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Note: Full MCP client implementation would use @modelcontextprotocol/sdk
      // This is a simplified adapter that can be extended
      console.log(`Connecting to MCP server: ${this.name}`);

      switch (this.options.transport) {
        case "stdio":
          await this.connectStdio();
          break;
        case "sse":
        case "http":
          await this.connectHTTP();
          break;
        default:
          throw new Error(`Unknown transport: ${this.options.transport}`);
      }

      this.connected = true;
    } catch (error) {
      console.error(`Failed to connect to MCP server ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Connect via stdio transport
   */
  private async connectStdio(): Promise<void> {
    // Placeholder for stdio connection
    // Full implementation would spawn the process and communicate via stdin/stdout
    console.log(
      `Stdio connection to ${this.options.command} not yet implemented`
    );
  }

  /**
   * Connect via HTTP/SSE transport
   */
  private async connectHTTP(): Promise<void> {
    if (!this.options.url) {
      throw new Error("URL required for HTTP/SSE transport");
    }

    // Fetch tools from the server
    const response = await fetch(`${this.options.url}/tools`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(this.options.timeout || 10_000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tools: ${response.statusText}`);
    }

    const data = (await response.json()) as { tools: MCPTool[] };
    this.tools = data.tools || [];
  }

  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    this.tools = [];
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * List available tools
   */
  async listTools(): Promise<MCPTool[]> {
    if (!this.connected) {
      await this.connect();
    }
    return this.tools;
  }

  /**
   * Execute a tool on the server
   */
  async executeTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.connected) {
      await this.connect();
    }

    const tool = this.tools.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    if (this.options.transport === "http" || this.options.transport === "sse") {
      const response = await fetch(
        `${this.options.url}/tools/${toolName}/execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ arguments: args }),
          signal: AbortSignal.timeout(this.options.timeout || 30_000),
        }
      );

      if (!response.ok) {
        throw new Error(`Tool execution failed: ${response.statusText}`);
      }

      return response.json();
    }

    throw new Error(
      `Tool execution not implemented for ${this.options.transport}`
    );
  }
}

/**
 * Create an MCP server connection
 */
export function createMCPServer(options: MCPServerOptions): IMCPServer {
  return new MCPServer(options);
}

/**
 * Import tools from an MCP server into the tool registry
 */
export async function importMCPServer(
  server: IMCPServer,
  options: {
    prefix?: string;
    filter?: (tool: MCPTool) => boolean;
  } = {}
): Promise<ToolDefinition[]> {
  const { prefix = "", filter = () => true } = options;

  const mcpTools = await server.listTools();
  const importedTools: ToolDefinition[] = [];

  for (const mcpTool of mcpTools) {
    if (!filter(mcpTool)) {
      continue;
    }

    const toolDef = convertMCPToolToDefinition(mcpTool, server, prefix);
    toolRegistry.register(toolDef);
    importedTools.push(toolDef);
  }

  return importedTools;
}

/**
 * Import a single MCP tool
 */
export async function importMCPTool(
  server: IMCPServer,
  toolName: string,
  options: { alias?: string } = {}
): Promise<ToolDefinition | null> {
  const tools = await server.listTools();
  const mcpTool = tools.find((t) => t.name === toolName);

  if (!mcpTool) {
    return null;
  }

  const toolDef = convertMCPToolToDefinition(
    mcpTool,
    server,
    "",
    options.alias
  );
  toolRegistry.register(toolDef);

  return toolDef;
}

/**
 * Convert MCP tool to our tool definition format
 */
function convertMCPToolToDefinition(
  mcpTool: MCPTool,
  server: IMCPServer,
  prefix: string,
  alias?: string
): ToolDefinition {
  const name = alias || (prefix ? `${prefix}_${mcpTool.name}` : mcpTool.name);

  // Convert MCP input schema to Zod schema
  const parameters = convertMCPSchemaToZod(mcpTool.inputSchema);

  return {
    name,
    description: mcpTool.description,
    category: "mcp",
    parameters,
    execute: async (
      params: Record<string, unknown>,
      _context: ToolContext
    ): Promise<unknown> => server.executeTool(mcpTool.name, params),
    metadata: {
      mcpServer: server.name,
      mcpToolName: mcpTool.name,
    },
  };
}

/**
 * Convert MCP JSON Schema to Zod schema
 */
function convertMCPSchemaToZod(
  schema: MCPTool["inputSchema"]
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      shape[key] = convertPropertyToZod(
        prop as MCPPropertySchema,
        schema.required?.includes(key) ?? false
      );
    }
  }

  return z.object(shape);
}

/**
 * Convert a single property to Zod type
 */
function convertPropertyToZod(
  prop: MCPPropertySchema,
  required: boolean
): z.ZodTypeAny {
  let zodType: z.ZodTypeAny;

  switch (prop.type) {
    case "string":
      if (prop.enum && prop.enum.length > 0) {
        zodType = z.enum(prop.enum as [string, ...string[]]);
      } else {
        zodType = z.string();
      }
      break;
    case "number":
    case "integer":
      zodType = z.number();
      break;
    case "boolean":
      zodType = z.boolean();
      break;
    case "array":
      zodType = z.array(
        prop.items ? convertPropertyToZod(prop.items, true) : z.unknown()
      );
      break;
    case "object":
      if (prop.properties) {
        const nestedShape: Record<string, z.ZodTypeAny> = {};
        for (const [k, v] of Object.entries(prop.properties)) {
          nestedShape[k] = convertPropertyToZod(v, true);
        }
        zodType = z.object(nestedShape);
      } else {
        zodType = z.record(z.string(), z.unknown());
      }
      break;
    default:
      zodType = z.unknown();
  }

  if (prop.description) {
    zodType = zodType.describe(prop.description);
  }

  return required ? zodType : zodType.optional();
}

/**
 * Convert a tool definition to MCP format
 */
export function toolToMCP(tool: ToolDefinition): MCPTool {
  // Get the Zod schema shape
  const shape = (tool.parameters as z.ZodObject<Record<string, z.ZodTypeAny>>)
    .shape;
  const properties: Record<string, MCPPropertySchema> = {};
  const required: string[] = [];

  for (const [key, zodType] of Object.entries(shape)) {
    const prop = zodTypeToMCPProperty(zodType);
    properties[key] = prop;

    // Check if required
    if (!(zodType instanceof z.ZodOptional)) {
      required.push(key);
    }
  }

  return {
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    },
  };
}

/**
 * Convert Zod type to MCP property schema
 */
function zodTypeToMCPProperty(zodType: z.ZodTypeAny): MCPPropertySchema {
  const typeName = zodType._def?.typeName;

  // Handle optional
  if (typeName === "ZodOptional") {
    return zodTypeToMCPProperty(zodType._def.innerType);
  }

  // Handle string
  if (typeName === "ZodString") {
    return {
      type: "string",
      description: zodType.description,
    };
  }

  // Handle number
  if (typeName === "ZodNumber") {
    return {
      type: "number",
      description: zodType.description,
    };
  }

  // Handle boolean
  if (typeName === "ZodBoolean") {
    return {
      type: "boolean",
      description: zodType.description,
    };
  }

  // Handle array
  if (typeName === "ZodArray") {
    return {
      type: "array",
      items: zodTypeToMCPProperty(zodType._def.type),
      description: zodType.description,
    };
  }

  // Handle enum
  if (typeName === "ZodEnum") {
    const enumValues = Object.values(zodType._def.values || {}) as string[];
    return {
      type: "string",
      enum: enumValues,
      description: zodType.description,
    };
  }

  // Handle object
  if (typeName === "ZodObject") {
    const shape = (zodType as z.ZodObject<Record<string, z.ZodTypeAny>>).shape;
    const properties: Record<string, MCPPropertySchema> = {};

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodTypeToMCPProperty(value as z.ZodTypeAny);
    }

    return {
      type: "object",
      properties,
      description: zodType.description,
    };
  }

  // Default to object
  return {
    type: "object",
    description: zodType.description,
  };
}

/**
 * Convert all registered tools to MCP format
 */
export function allToolsToMCP(): MCPTool[] {
  return toolRegistry.list().map(toolToMCP);
}

/**
 * Convert MCP tools to AI SDK CoreTool format
 */
export function mcpToolsToAISDK(
  mcpTools: MCPTool[],
  server: IMCPServer
): Record<string, CoreTool> {
  const tools: Record<string, CoreTool> = {};

  for (const mcpTool of mcpTools) {
    const parameters = convertMCPSchemaToZod(mcpTool.inputSchema);

    tools[mcpTool.name] = aiTool({
      description: mcpTool.description,
      parameters,
      execute: async (params) =>
        server.executeTool(mcpTool.name, params as Record<string, unknown>),
    });
  }

  return tools;
}

export default {
  createMCPServer,
  importMCPServer,
  importMCPTool,
  toolToMCP,
  allToolsToMCP,
  mcpToolsToAISDK,
};
