import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPrompts } from "./mcp.prompts";
import { registerResources } from "./mcp.resources";
import type { McpContext } from "./mcp.types";
import { getDateContext } from "./mcp.utils";
import {
  registerConnectorTools,
  registerContextTools,
  registerSearchTools,
  registerSyncTools,
  registerTeamTools,
} from "./tools";

const MCP_SERVER_VERSION = process.env.GIT_COMMIT_SHA?.slice(0, 7) || "0.1.0";

function getServerInstructions(ctx: McpContext): string {
  const dateCtx = getDateContext(ctx.timezone);
  const userLocale = ctx.locale || "en";

  return `OpenBeam is an enterprise search and AI assistant platform with 100+ connectors. This MCP server provides access to enterprise documents, connectors, sync operations, and team management.

## Current Date & Timezone

Today is ${dateCtx.date} in the user's timezone (${dateCtx.timezone}). The current year is ${dateCtx.year}, current quarter is Q${dateCtx.quarter}. Use these for default date ranges:
- This month: from ${dateCtx.monthStart} to ${dateCtx.date}
- This quarter: from ${dateCtx.quarterStart} to ${dateCtx.date}
- This year: from ${dateCtx.yearStart} to ${dateCtx.date}

## Locale

The user's locale is "${userLocale}". Format dates and numbers according to this locale when presenting data.

## Tool Organization

Tools are namespaced by domain — use the prefix to discover related tools:
- search_* — Hybrid semantic + keyword search across all connected data sources
- connector_* — Manage connected data sources (list, status, configure)
- sync_* — Trigger and monitor sync operations (full, incremental)
- context_* — Read and store context entries, memories, and relations
- team_* — Team metadata, members, and settings

## Key Patterns

- Date parameters use ISO 8601 format (YYYY-MM-DD for dates, full ISO for timestamps).
- List tools support cursor-based pagination; pass the returned cursor to fetch the next page.
- Tool errors return isError: true with a text explanation.
- Use search_documents for quick lookups across all data types instead of listing each connector separately.
- Call team_get first when you need team settings or base configuration.
`;
}

export { MCP_SERVER_VERSION };

export function createOpenBeamMcpServer(ctx: McpContext): McpServer {
  const server = new McpServer(
    {
      name: "openbeam",
      version: MCP_SERVER_VERSION,
    },
    {
      instructions: getServerInstructions(ctx),
    }
  );

  registerSearchTools(server, ctx);
  registerConnectorTools(server, ctx);
  registerSyncTools(server, ctx);
  registerContextTools(server, ctx);
  registerTeamTools(server, ctx);

  registerResources(server, ctx);
  registerPrompts(server, ctx);

  return server;
}
