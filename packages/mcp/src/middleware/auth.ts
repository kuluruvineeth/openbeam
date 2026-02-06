import type { PermissionMode } from "@openplane/types/ai";

export interface McpAuthContext {
  teamId: string;
  userId: string;
  permissionMode: PermissionMode;
  approvedTools?: string[];
}

const REQUIRED_ENV_VARS = ["MCP_TEAM_ID", "MCP_USER_ID"] as const;

export function extractAuthContext(): McpAuthContext | null {
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

  return { teamId, userId, permissionMode, approvedTools };
}

export function requireAuth(): McpAuthContext {
  const ctx = extractAuthContext();
  if (!ctx) {
    throw new Error(
      `MCP authentication required. Set environment variables: ${REQUIRED_ENV_VARS.join(", ")}`
    );
  }
  return ctx;
}

export function isToolAllowedForContext(
  toolName: string,
  ctx: McpAuthContext
): boolean {
  if (ctx.permissionMode === "elevated") {
    return true;
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
