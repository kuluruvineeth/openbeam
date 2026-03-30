import { createHash } from "node:crypto";
import { StreamableHTTPTransport } from "@hono/mcp";
import db, {
  updateOAuthTokenLastUsed,
  validateOAuthAccessToken,
} from "@openbeam/db";
import type { Context } from "hono";
import type { AuthEnv } from "@/middleware/auth";
import { extractApiKey, verifyApiKey } from "@/modules/auth/auth.service";
import { createOpenBeamMcpServer } from "./mcp.factory";
import type { McpContext } from "./mcp.types";

const API_URL = process.env.OPENBEAM_API_URL || "https://api.openbeam.work";

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

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

async function resolveApiKeyAuth(token: string): Promise<McpContext | null> {
  const authContext = await verifyApiKey(token);
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

async function resolveOAuthAuth(token: string): Promise<McpContext | null> {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const result = await validateOAuthAccessToken(db, tokenHash);
  if (!result) {
    return null;
  }

  updateOAuthTokenLastUsed(db, result.id);

  return {
    teamId: result.teamId,
    userId: result.userId,
    userEmail: null,
    scopes: result.scopes,
    timezone: null,
    locale: null,
  };
}

async function resolveAuth(req: Request): Promise<McpContext | null> {
  const token = extractBearerToken(req);
  if (!token) {
    return null;
  }

  if (token.startsWith("op_live_")) {
    return await resolveApiKeyAuth(token);
  }

  if (token.startsWith("op_access_")) {
    return await resolveOAuthAuth(token);
  }

  return await resolveApiKeyAuth(token);
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
