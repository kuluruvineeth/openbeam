import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { McpAuthContext } from "@openbeam/mcp-server";
import { createProductionMcpServer } from "@openbeam/mcp-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import { extractApiKey, verifyApiKey } from "@/modules/auth/auth.service";
import logger from "@/utils/logger";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Mcp-Api-Key",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

interface SessionEntry {
  transport: WebStandardStreamableHTTPServerTransport;
  authContext: McpAuthContext;
  lastActivity: number;
}

const sessions = new Map<string, SessionEntry>();

const SESSION_TTL_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [sessionId, entry] of sessions) {
    if (now - entry.lastActivity > SESSION_TTL_MS) {
      entry.transport.close();
      sessions.delete(sessionId);
    }
  }
}, CLEANUP_INTERVAL_MS);

function extractApiKeyFromRequest(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  const fromAuth = extractApiKey(authHeader ?? undefined);
  if (fromAuth) {
    return fromAuth;
  }

  const mcpHeader = req.headers.get("Mcp-Api-Key");
  if (mcpHeader?.startsWith("op_")) {
    return mcpHeader;
  }

  const url = new URL(req.url);
  const queryKey = url.searchParams.get("api_key");
  if (queryKey?.startsWith("op_")) {
    return queryKey;
  }

  return null;
}

async function resolveAuth(req: Request): Promise<McpAuthContext | null> {
  const apiKey = extractApiKeyFromRequest(req);
  if (!apiKey) {
    return null;
  }

  const authContext = await verifyApiKey(apiKey);
  if (!authContext || authContext.type !== "apiKey") {
    return null;
  }

  return {
    teamId: authContext.teamId,
    userId: authContext.apiKeyId,
    scopes: authContext.scopes,
    rateLimitRequestsPerMinute: 120,
    source: "api_key",
    permissionMode: "readOnly",
  };
}

function addCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  const headers = new Headers({
    "Content-Type": "application/json",
    ...CORS_HEADERS,
  });
  return new Response(JSON.stringify(body), { status, headers });
}

async function createSessionEntry(
  auth: McpAuthContext
): Promise<{ sessionId: string; entry: SessionEntry }> {
  let sessionId = "";

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => {
      sessionId = crypto.randomUUID();
      return sessionId;
    },
    onsessioninitialized: (sid: string) => {
      logger.info({ sessionId: sid }, "MCP streamable session initialized");
    },
    enableJsonResponse: true,
  });

  const { server } = createProductionMcpServer({
    transport: "http",
    enableRateLimit: true,
    enableAudit: true,
  });

  await server.connect(transport);

  const entry: SessionEntry = {
    transport,
    authContext: auth,
    lastActivity: Date.now(),
  };

  return { sessionId, entry };
}

const mcpStreamableHttp = new OpenAPIHono<AuthEnv>();

mcpStreamableHttp.on(["POST", "GET", "DELETE", "OPTIONS"], "/", async (c) => {
  const req = c.req.raw;
  const method = req.method;

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const auth = await resolveAuth(req);
  if (!auth) {
    return jsonResponse(
      {
        error: "Unauthorized",
        message:
          "Valid API key required. Use Authorization: Bearer op_xxx header.",
      },
      401
    );
  }

  const existingSessionId = req.headers.get("Mcp-Session-Id");

  if (method === "DELETE") {
    if (existingSessionId && sessions.has(existingSessionId)) {
      const entry = sessions.get(existingSessionId);
      if (entry) {
        const response = await entry.transport.handleRequest(req);
        await entry.transport.close();
        sessions.delete(existingSessionId);
        return addCorsHeaders(response);
      }
    }
    return jsonResponse({ error: "Session not found" }, 404);
  }

  if (existingSessionId) {
    const entry = sessions.get(existingSessionId);
    if (entry) {
      entry.lastActivity = Date.now();
      const response = await entry.transport.handleRequest(req);
      return addCorsHeaders(response);
    }
    return jsonResponse(
      {
        error: "Session not found",
        message: "Send an initialize request to create a new session",
      },
      404
    );
  }

  if (method === "POST") {
    const { entry } = await createSessionEntry(auth);

    const response = await entry.transport.handleRequest(req);

    const responseSessionId = entry.transport.sessionId;
    if (responseSessionId) {
      sessions.set(responseSessionId, entry);
    }

    return addCorsHeaders(response);
  }

  if (method === "GET") {
    return jsonResponse(
      {
        error: "Bad Request",
        message:
          "GET requests require an existing session. Send a POST with an initialize request first.",
      },
      400
    );
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
});

export default mcpStreamableHttp;
