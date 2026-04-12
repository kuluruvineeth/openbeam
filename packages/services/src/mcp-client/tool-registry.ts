import type { McpClientPool } from "@openbeam/mcp-server/client";
import {
  sanitizeToolDescription,
  sanitizeToolName,
  sanitizeToolResult,
} from "./sanitize";

const NAMESPACE_SEPARATOR = "__";

interface ExternalToolDefinition {
  name: string;
  namespacedName: string;
  serverId: string;
  serverSlug: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

interface RouteInfo {
  serverId: string;
  originalName: string;
}

export class ExternalToolRegistry {
  private readonly tools = new Map<string, ExternalToolDefinition>();

  register(
    serverId: string,
    serverSlug: string,
    rawTools: Array<{
      name: string;
      description?: string;
      inputSchema?: Record<string, unknown>;
    }>
  ): void {
    for (const tool of rawTools) {
      const safeName = sanitizeToolName(tool.name);
      const namespacedName = `${serverSlug}${NAMESPACE_SEPARATOR}${safeName}`;
      const description = sanitizeToolDescription(tool.description ?? "");

      this.tools.set(namespacedName, {
        name: tool.name,
        namespacedName,
        serverId,
        serverSlug,
        description,
        inputSchema: tool.inputSchema,
      });
    }
  }

  unregister(serverId: string): void {
    for (const [name, def] of this.tools) {
      if (def.serverId === serverId) {
        this.tools.delete(name);
      }
    }
  }

  route(namespacedName: string): RouteInfo | null {
    const def = this.tools.get(namespacedName);
    if (!def) {
      return null;
    }
    return { serverId: def.serverId, originalName: def.name };
  }

  async callTool(
    pool: McpClientPool,
    namespacedName: string,
    args: Record<string, unknown>
  ): Promise<string> {
    const routeInfo = this.route(namespacedName);
    if (!routeInfo) {
      return `Tool "${namespacedName}" not found`;
    }

    const client = pool.getClient(routeInfo.serverId);
    if (!client) {
      return `Plugin server for "${namespacedName}" is not connected`;
    }

    const result = await client.callTool({
      name: routeInfo.originalName,
      arguments: args,
    });

    const rawText = (result.content as Array<{ type: string; text?: string }>)
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text)
      .join("\n");

    return sanitizeToolResult(rawText);
  }

  getAllDefinitions(): ExternalToolDefinition[] {
    return [...this.tools.values()];
  }

  getByServer(serverId: string): ExternalToolDefinition[] {
    return [...this.tools.values()].filter((t) => t.serverId === serverId);
  }

  has(namespacedName: string): boolean {
    return this.tools.has(namespacedName);
  }

  get size(): number {
    return this.tools.size;
  }

  clear(): void {
    this.tools.clear();
  }
}

export const externalToolRegistry = new ExternalToolRegistry();
