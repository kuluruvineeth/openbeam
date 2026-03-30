import { StreamableHTTPTransport } from "@hono/mcp";
import type { Context } from "hono";
import type { AuthEnv } from "@/middleware/auth";
import { extractApiKey, verifyApiKey } from "@/modules/auth/auth.service";
import { createOpenBeamMcpServer } from "./mcp.factory";
import type { McpContext } from "./mcp.types";

const API_URL = process.env.OPENBEAM_API_URL || "https://api.openbeam.work";

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
    c.req.raw.headers.set("Accept", "application/json, text/event-stream");
  }

  return handleTransport(c);
}

async function handleTransport(c: Context<AuthEnv>): Promise<Response> {
  const ctx = await resolveAuth(c.req.raw);
  if (!ctx) {
    const resourceMetadataUrl = `${API_URL}/.well-known/oauth-protected-resource`;
    return c.json(
      {
        error: "unauthorized",
        error_description:
          "Bearer token required. Provide an API key via the Authorization header.",
      },
      401,
      {
        "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl}"`,
      }
    );
  }

  const transport = new StreamableHTTPTransport();
  const server = createOpenBeamMcpServer(ctx);
  await server.connect(transport);

  const response = await transport.handleRequest(c);
  return response ?? new Response("Not Found", { status: 404 });
}
