import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

interface ProxyOptions {
  apiKey: string;
  serverUrl: string;
}

export async function startProxy(options: ProxyOptions): Promise<void> {
  const { apiKey, serverUrl } = options;
  const mcpEndpoint = new URL("/mcp", serverUrl);

  const upstream = new Client(
    { name: "openbeam-mcp-proxy", version: "0.1.0" },
    { capabilities: {} }
  );

  const transport = new StreamableHTTPClientTransport(mcpEndpoint, {
    requestInit: {
      headers: { Authorization: `Bearer ${apiKey}` },
    },
  });

  await upstream.connect(transport);

  const local = new Server(
    { name: "openbeam", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  local.setRequestHandler(ListToolsRequestSchema, async () => {
    const result = await upstream.listTools();
    return { tools: result.tools };
  });

  local.setRequestHandler(CallToolRequestSchema, async (request) => {
    const result = await upstream.callTool({
      name: request.params.name,
      arguments: request.params.arguments,
    });

    return {
      content: result.content as Array<{ type: string; text: string }>,
      isError: (result.isError as boolean | undefined) ?? false,
      structuredContent: result.structuredContent as
        | Record<string, unknown>
        | undefined,
    };
  });

  const stdio = new StdioServerTransport();
  await local.connect(stdio);
}
