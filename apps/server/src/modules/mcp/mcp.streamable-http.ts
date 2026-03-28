import { extractApiKey, verifyApiKey } from "@/modules/auth/auth.service";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Mcp-Api-Key",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

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

interface AuthResult {
  teamId: string;
  userId: string;
  scopes: string[];
}

async function resolveAuth(req: Request): Promise<AuthResult | null> {
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
  };
}

export async function handleMcpRequest(c: {
  req: { raw: Request };
}): Promise<Response> {
  const req = c.req.raw;
  const method = req.method;

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (method === "GET") {
    return jsonResponse(
      {
        jsonrpc: "2.0",
        result: {
          name: "openbeam",
          version: "0.1.0",
          description: "OpenBeam MCP Server — 103+ enterprise connectors",
        },
      },
      200
    );
  }

  if (method === "DELETE") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse(
      {
        jsonrpc: "2.0",
        error: { code: -32_700, message: "Parse error" },
        id: null,
      },
      400
    );
  }

  const rpcMethod = body.method as string;
  const rpcId = body.id;

  if (rpcMethod === "initialize") {
    return jsonResponse(
      {
        jsonrpc: "2.0",
        result: {
          protocolVersion: "2025-06-18",
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
            prompts: { listChanged: false },
          },
          serverInfo: {
            name: "openbeam",
            version: "0.1.0",
          },
        },
        id: rpcId,
      },
      200
    );
  }

  if (rpcMethod === "notifications/initialized") {
    return new Response(null, { status: 202, headers: CORS_HEADERS });
  }

  if (rpcMethod === "tools/list") {
    const auth = await resolveAuth(req);
    if (!auth) {
      return jsonResponse(
        {
          jsonrpc: "2.0",
          error: {
            code: -32_001,
            message: "Unauthorized — provide API key via Authorization header",
          },
          id: rpcId,
        },
        200
      );
    }

    return jsonResponse(
      {
        jsonrpc: "2.0",
        result: {
          tools: [
            {
              name: "search_documents",
              description:
                "Search across all connected enterprise data sources using hybrid semantic + keyword search.",
              inputSchema: {
                type: "object",
                properties: {
                  query: { type: "string", description: "The search query" },
                  limit: {
                    type: "number",
                    description: "Max results (1-50)",
                    default: 10,
                  },
                },
                required: ["query"],
              },
            },
            {
              name: "ask_question",
              description:
                "Answer a question using the enterprise knowledge base with RAG and citations.",
              inputSchema: {
                type: "object",
                properties: {
                  question: {
                    type: "string",
                    description: "The question to answer",
                  },
                },
                required: ["question"],
              },
            },
            {
              name: "list_connectors",
              description:
                "List all connected data sources and their sync status.",
              inputSchema: { type: "object", properties: {} },
            },
            {
              name: "get_document",
              description:
                "Retrieve the full content of a specific document by ID.",
              inputSchema: {
                type: "object",
                properties: {
                  document_id: {
                    type: "string",
                    description: "Document ID from search results",
                  },
                },
                required: ["document_id"],
              },
            },
            {
              name: "search_people",
              description:
                "Find people in the organization by name, email, or expertise.",
              inputSchema: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "Person name, email, or expertise",
                  },
                },
                required: ["query"],
              },
            },
          ],
        },
        id: rpcId,
      },
      200
    );
  }

  if (rpcMethod === "resources/list") {
    return jsonResponse(
      {
        jsonrpc: "2.0",
        result: {
          resources: [],
          resourceTemplates: [
            {
              uriTemplate: "openbeam://resources/{teamId}/",
              name: "Enterprise Resources",
              mimeType: "application/json",
            },
          ],
        },
        id: rpcId,
      },
      200
    );
  }

  if (rpcMethod === "prompts/list") {
    return jsonResponse(
      { jsonrpc: "2.0", result: { prompts: [] }, id: rpcId },
      200
    );
  }

  return jsonResponse(
    {
      jsonrpc: "2.0",
      error: { code: -32_601, message: `Method not found: ${rpcMethod}` },
      id: rpcId,
    },
    200
  );
}
