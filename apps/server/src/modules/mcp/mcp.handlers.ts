import {
  createMCPServer,
  createRequest,
  type MCPServerContext,
  toolRegistry,
} from "@openbeam/ai";
import type { Context } from "hono";
import { paymentConfig } from "@/lib/payment-config";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import { registerPrompts } from "./mcp.prompts";
import { registerResources } from "./mcp.resources";
import type { McpContext } from "./mcp.types";

const mcpServer = createMCPServer(toolRegistry, {
  name: "openbeam-mcp",
  version: "1.0.0",
  capabilities: {
    tools: true,
    resources: true,
    prompts: true,
  },
});

function buildMCPContext(c: Context<AuthEnv>): MCPServerContext {
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  let userId: string | undefined;
  if (authContext?.type === "session") {
    userId = authContext.userId;
  }

  return {
    teamId: teamId ?? "",
    userId,
  };
}

function buildMcpContext(c: Context<AuthEnv>): McpContext {
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  let userId = "";
  let userEmail: string | null = null;
  let scopes: string[] = [];

  if (authContext?.type === "session") {
    userId = authContext.userId;
    userEmail = authContext.email ?? null;
    scopes = ["team.read", "connectors.read", "documents.read", "search.read"];
  } else if (authContext?.type === "apiKey") {
    userId = authContext.apiKeyId;
    scopes = authContext.scopes;
  }

  return {
    teamId: teamId ?? "",
    userId,
    userEmail,
    scopes,
    timezone: null,
    locale: null,
  };
}

const registeredContexts = new Set<string>();

function ensureRegistered(ctx: McpContext): void {
  const key = `${ctx.teamId}:${ctx.scopes.sort().join(",")}`;
  if (registeredContexts.has(key)) {
    return;
  }

  registerResources(mcpServer.getResourceRegistry(), ctx);
  registerPrompts(mcpServer.getPromptRegistry(), ctx);
  registeredContexts.add(key);
}

let initPromise: Promise<void> | null = null;

async function ensureInitialized(context: MCPServerContext): Promise<void> {
  if (mcpServer.isInitialized()) {
    return;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const initRequest = createRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: { tools: true, resources: true, prompts: true },
        clientInfo: { name: "openbeam-http", version: "1.0.0" },
      });
      await mcpServer.handleRequest(initRequest, context);
    })();
  }

  await initPromise;
}

export async function listToolsHandler(c: Context<AuthEnv>) {
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 401);
  }

  const context = buildMCPContext(c);
  await ensureInitialized(context);

  const request = createRequest("tools/list");
  const response = await mcpServer.handleRequest(request, context);

  if (response.error) {
    return c.json(
      { error: response.error.message, code: response.error.code },
      500
    );
  }

  const result = response.result as { tools: unknown[] };
  return c.json({ tools: result.tools }, 200);
}

export async function callToolHandler(c: Context<AuthEnv>) {
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 401);
  }

  const name = c.req.param("name") ?? "";
  const body = await c.req.json<{ arguments?: Record<string, unknown> }>();

  if (paymentConfig.enabled) {
    const toolMeta = toolRegistry.getMetadata(name);
    const pricing = toolMeta?.pricing;

    if (pricing) {
      const paymentHeader = c.req.header("X-PAYMENT");

      if (!paymentHeader) {
        return c.json(
          {
            error: "Payment required",
            paymentDetails: {
              amount: pricing.amount,
              currency: pricing.currency,
              network: pricing.network,
              payeeAddress: paymentConfig.payeeAddress,
              facilitatorUrl: paymentConfig.facilitatorUrl,
              description: pricing.description ?? `Payment for tool: ${name}`,
            },
          },
          402
        );
      }
    }
  }

  const context = buildMCPContext(c);
  await ensureInitialized(context);

  const request = createRequest("tools/call", {
    name,
    arguments: body.arguments ?? {},
  });

  const response = await mcpServer.handleRequest(request, context);

  if (response.error) {
    if (response.error.code === -32_003) {
      return c.json(
        { error: response.error.message, code: response.error.code },
        404
      );
    }
    if (response.error.code === -32_602) {
      return c.json(
        { error: response.error.message, code: response.error.code },
        400
      );
    }
    return c.json(
      { error: response.error.message, code: response.error.code },
      500
    );
  }

  return c.json(
    response.result as { content: unknown[]; isError?: boolean },
    200
  );
}

export async function listResourcesHandler(c: Context<AuthEnv>) {
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 401);
  }

  ensureRegistered(buildMcpContext(c));
  const context = buildMCPContext(c);
  await ensureInitialized(context);

  const request = createRequest("resources/list");
  const response = await mcpServer.handleRequest(request, context);

  if (response.error) {
    return c.json(
      { error: response.error.message, code: response.error.code },
      500
    );
  }

  const result = response.result as {
    resources: unknown[];
    nextCursor?: string;
  };
  return c.json(
    { resources: result.resources, nextCursor: result.nextCursor },
    200
  );
}

export async function readResourceHandler(c: Context<AuthEnv>) {
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 401);
  }

  ensureRegistered(buildMcpContext(c));
  const uri = c.req.param("uri") ?? "";
  const decodedUri = decodeURIComponent(uri);
  const context = buildMCPContext(c);
  await ensureInitialized(context);

  const request = createRequest("resources/read", { uri: decodedUri });
  const response = await mcpServer.handleRequest(request, context);

  if (response.error) {
    if (response.error.code === -32_002) {
      return c.json(
        { error: response.error.message, code: response.error.code },
        404
      );
    }
    return c.json(
      { error: response.error.message, code: response.error.code },
      500
    );
  }

  return c.json(response.result as { contents: unknown[] }, 200);
}

export async function listPromptsHandler(c: Context<AuthEnv>) {
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 401);
  }

  ensureRegistered(buildMcpContext(c));
  const context = buildMCPContext(c);
  await ensureInitialized(context);

  const request = createRequest("prompts/list");
  const response = await mcpServer.handleRequest(request, context);

  if (response.error) {
    return c.json(
      { error: response.error.message, code: response.error.code },
      500
    );
  }

  const result = response.result as { prompts: unknown[] };
  return c.json({ prompts: result.prompts }, 200);
}

export async function getPromptHandler(c: Context<AuthEnv>) {
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 401);
  }

  ensureRegistered(buildMcpContext(c));
  const name = c.req.param("name");
  const argsParam = c.req.query("args");
  const context = buildMCPContext(c);
  await ensureInitialized(context);

  let parsedArgs: Record<string, string> = {};
  if (argsParam) {
    try {
      parsedArgs = JSON.parse(argsParam) as Record<string, string>;
    } catch {
      return c.json({ error: "Invalid JSON in args parameter" }, 400);
    }
  }

  const request = createRequest("prompts/get", {
    name,
    arguments: parsedArgs,
  });

  const response = await mcpServer.handleRequest(request, context);

  if (response.error) {
    if (response.error.code === -32_004) {
      return c.json(
        { error: response.error.message, code: response.error.code },
        404
      );
    }
    if (response.error.code === -32_602) {
      return c.json(
        { error: response.error.message, code: response.error.code },
        400
      );
    }
    return c.json(
      { error: response.error.message, code: response.error.code },
      500
    );
  }

  return c.json(
    response.result as { description?: string; messages: unknown[] },
    200
  );
}
