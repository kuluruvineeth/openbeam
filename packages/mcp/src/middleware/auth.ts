import type { PermissionMode } from "@openbeam/types/ai";
import { z } from "zod";

const DEFAULT_RATE_LIMIT_RPM = 60;

const McpAuthContextSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
  scopes: z.array(z.string()),
  rateLimitRequestsPerMinute: z.number().int().positive(),
  source: z.enum(["env", "api_key", "token"]),
  permissionMode: z.custom<PermissionMode>(),
  approvedTools: z.array(z.string()).optional(),
});

export type McpAuthContext = z.infer<typeof McpAuthContextSchema>;

function resolveFromApiKey(): McpAuthContext | null {
  const apiKey = process.env.MCP_API_KEY;
  if (!apiKey) {
    return null;
  }

  const teamId = process.env.MCP_API_KEY_TEAM_ID;
  const userId = process.env.MCP_API_KEY_USER_ID;
  if (!(teamId && userId)) {
    return null;
  }

  const scopes = process.env.MCP_API_KEY_SCOPES
    ? process.env.MCP_API_KEY_SCOPES.split(",").map((s) => s.trim())
    : ["read"];

  const rpm = process.env.MCP_API_KEY_RPM
    ? Number.parseInt(process.env.MCP_API_KEY_RPM, 10)
    : DEFAULT_RATE_LIMIT_RPM;

  const permissionMode = (process.env.MCP_PERMISSION_MODE ??
    "readOnly") as PermissionMode;

  return McpAuthContextSchema.parse({
    teamId,
    userId,
    scopes,
    rateLimitRequestsPerMinute: rpm,
    source: "api_key" as const,
    permissionMode,
  });
}

function resolveFromToken(): McpAuthContext | null {
  const token = process.env.MCP_TOKEN;
  if (!token) {
    return null;
  }

  const teamId = process.env.MCP_TOKEN_TEAM_ID;
  const userId = process.env.MCP_TOKEN_USER_ID;
  if (!(teamId && userId)) {
    return null;
  }

  const scopes = process.env.MCP_TOKEN_SCOPES
    ? process.env.MCP_TOKEN_SCOPES.split(",").map((s) => s.trim())
    : ["read", "write"];

  const rpm = process.env.MCP_TOKEN_RPM
    ? Number.parseInt(process.env.MCP_TOKEN_RPM, 10)
    : DEFAULT_RATE_LIMIT_RPM * 2;

  const permissionMode = (process.env.MCP_PERMISSION_MODE ??
    "elevated") as PermissionMode;

  const approvedTools = process.env.MCP_APPROVED_TOOLS
    ? process.env.MCP_APPROVED_TOOLS.split(",").map((t) => t.trim())
    : undefined;

  return McpAuthContextSchema.parse({
    teamId,
    userId,
    scopes,
    rateLimitRequestsPerMinute: rpm,
    source: "token" as const,
    permissionMode,
    approvedTools,
  });
}

function resolveFromEnv(): McpAuthContext | null {
  const teamId = process.env.MCP_TEAM_ID;
  const userId = process.env.MCP_USER_ID;

  if (!(teamId && userId)) {
    return null;
  }

  const permissionMode = (process.env.MCP_PERMISSION_MODE ??
    "readOnly") as PermissionMode;

  const approvedTools = process.env.MCP_APPROVED_TOOLS
    ? process.env.MCP_APPROVED_TOOLS.split(",").map((t) => t.trim())
    : undefined;

  return McpAuthContextSchema.parse({
    teamId,
    userId,
    scopes: ["read"],
    rateLimitRequestsPerMinute: DEFAULT_RATE_LIMIT_RPM,
    source: "env" as const,
    permissionMode,
    approvedTools,
  });
}

export function resolveAuthContext(): McpAuthContext {
  const fromApiKey = resolveFromApiKey();
  if (fromApiKey) {
    return fromApiKey;
  }

  const fromToken = resolveFromToken();
  if (fromToken) {
    return fromToken;
  }

  const fromEnv = resolveFromEnv();
  if (fromEnv) {
    return fromEnv;
  }

  throw new Error(
    "MCP authentication required. Set MCP_API_KEY, MCP_TOKEN, or MCP_TEAM_ID + MCP_USER_ID"
  );
}

export function isToolAllowedForContext(
  toolName: string,
  ctx: McpAuthContext
): boolean {
  if (ctx.permissionMode === "elevated") {
    return true;
  }

  if (ctx.approvedTools && !ctx.approvedTools.includes(toolName)) {
    return false;
  }

  if (ctx.permissionMode === "readOnly") {
    return !isWriteTool(toolName);
  }

  return true;
}

const WRITE_TOOL_PATTERNS = [
  /^create_/,
  /^update_/,
  /^delete_/,
  /^trigger_/,
  /^sync_/,
];

function isWriteTool(toolName: string): boolean {
  return WRITE_TOOL_PATTERNS.some((pattern) => pattern.test(toolName));
}
