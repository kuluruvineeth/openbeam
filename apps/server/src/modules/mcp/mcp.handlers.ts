import {
  createMCPServer,
  createRequest,
  type MCPServerContext,
  toolRegistry,
} from "@openplane/ai";
import type { Context } from "hono";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";

const mcpServer = createMCPServer(toolRegistry, {
  name: "openplane-mcp",
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

async function ensureInitialized(context: MCPServerContext): Promise<void> {
  if (mcpServer.isInitialized()) {
    return;
  }

  const initRequest = createRequest("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: { tools: true, resources: true, prompts: true },
    clientInfo: { name: "openplane-http", version: "1.0.0" },
  });

  await mcpServer.handleRequest(initRequest, context);
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

  const name = c.req.param("name");
  const body = await c.req.json<{ arguments?: Record<string, unknown> }>();
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

  const uri = c.req.param("uri");
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
