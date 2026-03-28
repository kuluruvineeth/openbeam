import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface McpContext {
  teamId: string;
  userId: string;
  userEmail: string | null;
  scopes: string[];
  timezone: string | null;
  locale: string | null;
}

export type RegisterTools = (server: McpServer, ctx: McpContext) => void;

export const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export const WRITE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;

export const DESTRUCTIVE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function hasScope(ctx: McpContext, requiredScope: string): boolean {
  return ctx.scopes.includes(requiredScope);
}
