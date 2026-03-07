#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import prisma from "@openbeam/db";
import { getPrismaSchema } from "./resources/schema";
import { connectorTools, handleConnectorTool } from "./tools/connectors";
import { handleStatsTool, statsTools } from "./tools/stats";

const server = new Server(
  {
    name: "openbeam-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools: [...connectorTools, ...statsTools],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const connectorToolNames = connectorTools.map((t) => t.name);
  if (connectorToolNames.includes(name)) {
    return await handleConnectorTool(prisma, name, args);
  }

  const statsToolNames = statsTools.map((t) => t.name);
  if (statsToolNames.includes(name)) {
    return await handleStatsTool(prisma, name, args);
  }

  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
    isError: true,
  };
});

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "openbeam://schema/prisma",
      name: "Prisma Schema",
      description: "OpenBeam database schema definition",
      mimeType: "text/plain",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === "openbeam://schema/prisma") {
    const schema = await getPrismaSchema();
    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: schema,
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP server error:", error);
  process.exit(1);
});
