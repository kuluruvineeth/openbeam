import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import prisma from "@openbeam/db";
import { auditToolCall } from "./middleware/audit";
import {
  isToolAllowedForContext,
  type McpAuthContext,
  resolveAuthContext,
} from "./middleware/auth";
import { checkMcpRateLimit } from "./middleware/rate-limit";
import {
  getContextResourceTemplates,
  isContextUri,
  readContextResource,
} from "./resources/context";
import { getPrismaSchema } from "./resources/schema";
import { agentTools, handleAgentTool } from "./tools/agents";
import { connectorTools, handleConnectorTool } from "./tools/connectors";
import { documentTools, handleDocumentTool } from "./tools/documents";
import { handleQaTool, qaTools } from "./tools/qa";
import { handleSearchTool, searchTools } from "./tools/search";
import { handleStatsTool, statsTools } from "./tools/stats";

export interface ProductionMcpServerOptions {
  transport?: "stdio" | "http";
  enableRateLimit?: boolean;
  enableAudit?: boolean;
}

export function createProductionMcpServer(
  options: ProductionMcpServerOptions = {}
): { server: Server; authContext: McpAuthContext } {
  const { enableRateLimit = true, enableAudit = true } = options;

  const authContext = resolveAuthContext();

  const server = new Server(
    { name: "openbeam-mcp", version: "1.0.0" },
    { capabilities: { tools: {}, resources: {} } }
  );

  const allTools = [
    ...agentTools,
    ...connectorTools,
    ...documentTools,
    ...qaTools,
    ...searchTools,
    ...statsTools,
  ];

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: allTools.filter((t) => isToolAllowedForContext(t.name, authContext)),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!isToolAllowedForContext(name, authContext)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Permission denied: ${name} is not allowed for current auth context`,
          },
        ],
        isError: true,
      };
    }

    if (enableRateLimit) {
      const { allowed, retryAfterMs } = await checkMcpRateLimit(authContext);
      if (!allowed) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Rate limit exceeded. Retry after ${retryAfterMs}ms`,
            },
          ],
          isError: true,
        };
      }
    }

    const executeFn = () => {
      const agentToolNames = agentTools.map((t) => t.name);
      if (agentToolNames.includes(name)) {
        return handleAgentTool(
          authContext.teamId,
          authContext.userId,
          name,
          args
        );
      }

      const connectorToolNames = connectorTools.map((t) => t.name);
      if (connectorToolNames.includes(name)) {
        return handleConnectorTool(prisma, authContext.teamId, name, args);
      }

      const documentToolNames = documentTools.map((t) => t.name);
      if (documentToolNames.includes(name)) {
        return handleDocumentTool(authContext, name, args);
      }

      const qaToolNames = qaTools.map((t) => t.name);
      if (qaToolNames.includes(name)) {
        return handleQaTool(authContext.teamId, name, args);
      }

      const searchToolNames = searchTools.map((t) => t.name);
      if (searchToolNames.includes(name)) {
        return handleSearchTool(authContext, name, args);
      }

      const statsToolNames = statsTools.map((t) => t.name);
      if (statsToolNames.includes(name)) {
        return handleStatsTool(prisma, authContext.teamId, name, args);
      }

      return Promise.resolve({
        content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
        isError: true as const,
      });
    };

    if (enableAudit) {
      return auditToolCall(name, args, authContext, executeFn);
    }

    return executeFn();
  });

  const contextTemplates = getContextResourceTemplates().map((t) => ({
    uri: t.uriTemplate,
    name: t.name,
    description: t.description,
    mimeType: t.mimeType,
  }));

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: "openbeam://schema/prisma",
        name: "Prisma Schema",
        description: "OpenBeam database schema definition",
        mimeType: "text/plain",
      },
      ...contextTemplates,
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === "openbeam://schema/prisma") {
      const schema = await getPrismaSchema();
      return {
        contents: [{ uri, mimeType: "text/plain", text: schema }],
      };
    }

    if (isContextUri(uri)) {
      return readContextResource(prisma, uri);
    }

    throw new Error(`Unknown resource: ${uri}`);
  });

  return { server, authContext };
}
