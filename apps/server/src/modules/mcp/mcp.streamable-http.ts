import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { Context } from "hono";
import type { AuthEnv } from "@/middleware/auth";
import { extractApiKey, verifyApiKey } from "@/modules/auth/auth.service";
import { createOpenBeamMcpServer } from "./mcp.factory";
import type { McpContext } from "./mcp.types";

const REQUIRED_ACCEPT = "application/json, text/event-stream";

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

async function resolveAuth(req: Request): Promise<McpContext | null> {
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
    userEmail: null,
    scopes: authContext.scopes,
    timezone: null,
    locale: null,
  };
}

export function handleMcpRequest(
  c: Context<AuthEnv>
): Response | Promise<Response> {
  const req = c.req.raw;

  const accept = req.headers.get("Accept") ?? "";
  if (
    !(
      accept.includes("application/json") &&
      accept.includes("text/event-stream")
    )
  ) {
    const patched = new Request(req, {
      headers: new Headers(req.headers),
    });
    patched.headers.set("Accept", REQUIRED_ACCEPT);
    return handleTransport(patched);
  }

  return handleTransport(req);
}

async function handleTransport(req: Request): Promise<Response> {
  const ctx = await resolveAuth(req);
  if (!ctx) {
    return new Response(
      JSON.stringify({
        error: "unauthorized",
        error_description:
          "Bearer token required. Provide an API key via the Authorization header.",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": "Bearer",
        },
      }
    );
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  const server = createOpenBeamMcpServer(ctx);
  await server.connect(transport);

  const response = await transport.handleRequest(req);

  await transport.close();
  await server.close();

  return response;
}
