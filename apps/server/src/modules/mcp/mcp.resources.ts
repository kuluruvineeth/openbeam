import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { hasScope, type McpContext } from "./mcp.types";

const CONNECTOR_TYPES = [
  "slack",
  "github",
  "jira",
  "confluence",
  "notion",
  "google_drive",
  "google_calendar",
  "gmail",
  "outlook",
  "sharepoint",
  "teams",
  "salesforce",
  "linear",
  "asana",
  "hubspot",
  "zendesk",
  "intercom",
  "figma",
  "dropbox",
  "box",
] as const;

function jsonText(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function registerResources(server: McpServer, ctx: McpContext): void {
  if (hasScope(ctx, "team.read")) {
    server.resource(
      "team-info",
      "openbeam://team",
      {
        description:
          "Current team metadata including ID, plan, and configuration",
        mimeType: "application/json",
      },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: jsonText({
              teamId: ctx.teamId,
              userId: ctx.userId,
              userEmail: ctx.userEmail,
              timezone: ctx.timezone,
              locale: ctx.locale,
            }),
          },
        ],
      })
    );
  }

  if (hasScope(ctx, "connectors.read")) {
    server.resource(
      "connectors-list",
      "openbeam://connectors",
      {
        description:
          "List of all active data source connectors and their sync status",
        mimeType: "application/json",
      },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: jsonText({
              teamId: ctx.teamId,
              availableTypes: CONNECTOR_TYPES,
              hint: "Use the connector_list tool for live data.",
            }),
          },
        ],
      })
    );

    server.resource(
      "connector-detail",
      "openbeam://connectors/{connectorId}",
      {
        description: "Detailed information about a specific connector",
        mimeType: "application/json",
      },
      async (uri, { connectorId }) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: jsonText({
              connectorId,
              teamId: ctx.teamId,
              hint: "Use the connector_get tool for live data.",
            }),
          },
        ],
      })
    );

    server.resource(
      "connector-sync-history",
      "openbeam://connectors/{connectorId}/sync-history",
      {
        description: "Recent sync history for a specific connector",
        mimeType: "application/json",
      },
      async (uri, { connectorId }) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: jsonText({
              connectorId,
              teamId: ctx.teamId,
              hint: "Use the connector_sync_history tool for live data.",
            }),
          },
        ],
      })
    );
  }

  if (hasScope(ctx, "search.read")) {
    server.resource(
      "recent-docs",
      "openbeam://documents/recent",
      {
        description:
          "Documents indexed in the last 24 hours across all sources",
        mimeType: "application/json",
      },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: jsonText({
              teamId: ctx.teamId,
              hint: "Use search_documents with a time filter for live data.",
            }),
          },
        ],
      })
    );

    server.resource(
      "search-results",
      "openbeam://search/{queryId}",
      {
        description: "Cached search results for a specific query ID",
        mimeType: "application/json",
      },
      async (uri, { queryId }) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: jsonText({
              queryId,
              teamId: ctx.teamId,
              hint: "Use search_documents for a new search.",
            }),
          },
        ],
      })
    );
  }

  server.resource(
    "user-context",
    "openbeam://user/context",
    {
      description:
        "Current user context including permissions, timezone, and locale",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: jsonText({
            userId: ctx.userId,
            userEmail: ctx.userEmail,
            scopes: ctx.scopes,
            timezone: ctx.timezone,
            locale: ctx.locale,
          }),
        },
      ],
    })
  );

  server.resource(
    "connector-types",
    "openbeam://connector-types",
    {
      description: "List of all supported connector types",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: jsonText({
            types: CONNECTOR_TYPES.map((type) => ({
              id: type,
              name: type
                .split("_")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" "),
            })),
          }),
        },
      ],
    })
  );
}
