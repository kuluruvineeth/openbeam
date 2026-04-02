import { getUiCapability } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerOpenBeamApps } from "./mcp.apps";
import { registerPrompts } from "./mcp.prompts";
import { registerResources } from "./mcp.resources";
import type { McpContext } from "./mcp.types";
import { getDateContext } from "./mcp.utils";
import {
  registerActionTools,
  registerAdminTeamTools,
  registerApiKeyTools,
  registerConnectorManageTools,
  registerConnectorSetupTools,
  registerConnectorTools,
  registerContextTools,
  registerKnowledgeTools,
  registerSearchAdvancedTools,
  registerSearchTools,
  registerSyncControlTools,
  registerSyncMonitorTools,
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

## Decision Guide — Which Tool to Use

| User Intent | Start With | Then |
|-------------|-----------|------|
| Find information / answer a question | ask_question | context_read for citation details |
| Search for specific documents | search_documents | context_read for full content |
| Find conceptually similar content | search_semantic | search_similar for related docs |
| Find docs similar to a known doc | search_similar | context_read for full content |
| Find a person or expert | search_people | search_by_author for their docs |
| See all docs by a person | search_by_author | context_read for full content |
| Check data source health | connector_list (filter: error) | connector_health, sync_history |
| Trigger a data refresh | connector_list to find ID | sync_trigger, then sync_status |
| Send a message / create an issue | connector_actions_list | connector_action_execute |
| Team overview | team_info | team_members, connector_list |
| Recent activity / what's new | search_recent | search_documents for deeper search |

## Tool Namespaces

- search_* — Hybrid semantic + keyword search across all connected data sources
- connector_* — Manage connected data sources (list, details, health)
- connector_actions_* — Discover and execute write actions (send messages, create issues, etc.)
- sync_* — Trigger and monitor sync operations (full, incremental)
- context_* — Search and read the context database (memories, resources, skills)
- ask_question — AI-powered question answering with citations from enterprise data
- team_* — Team metadata and members

## Common Tool Chains

1. **Answer a question:** ask_question -> context_read (for citation URIs)
2. **Research a topic:** search_documents -> context_read (for full content) -> search_people (for experts)
3. **Diagnose sync issues:** connector_list(status: 'error') -> connector_health -> sync_history -> sync_trigger
4. **Execute an action:** connector_actions_list(connectorType) -> connector_list (to get connector ID) -> connector_action_execute
5. **Explore context:** context_search -> context_read(level: '2')
6. **Deep concept search:** search_semantic -> search_similar -> context_read
7. **Author research:** search_people -> search_by_author -> context_read
8. **Daily digest:** search_recent(hours: 24) -> search_documents for topics of interest

## Key Patterns

- Date parameters use ISO 8601 format (YYYY-MM-DD for dates, full ISO for timestamps).
- List tools support cursor-based pagination; pass the returned cursor to fetch the next page.
- Tool errors return isError: true with a text explanation.
- Use search_documents for quick lookups across all data types instead of listing each connector separately.
- Call team_info first when you need team settings or base configuration.
- Always call connector_actions_list before connector_action_execute to discover action IDs and required parameters.
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
  registerSearchAdvancedTools(server, ctx);
  registerConnectorTools(server, ctx);
  registerConnectorSetupTools(server, ctx);
  registerConnectorManageTools(server, ctx);
  registerSyncTools(server, ctx);
  registerSyncControlTools(server, ctx);
  registerSyncMonitorTools(server, ctx);
  registerContextTools(server, ctx);
  registerKnowledgeTools(server, ctx);
  registerTeamTools(server, ctx);
  registerActionTools(server, ctx);
  registerApiKeyTools(server, ctx);
  registerAdminTeamTools(server, ctx);

  registerResources(server, ctx);
  registerPrompts(server, ctx);
  registerOpenBeamApps(server);

  server.server.oninitialized = () => {
    const caps = server.server.getClientCapabilities();
    const uiCap = getUiCapability(caps);
    console.log(
      "[mcp] client capabilities:",
      JSON.stringify({
        extensions: (caps as Record<string, unknown>)?.extensions,
        uiCap,
      })
    );
  };

  return server;
}
