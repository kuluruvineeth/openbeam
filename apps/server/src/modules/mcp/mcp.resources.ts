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
      { description: "Current team metadata including ID and configuration" },
      (uri) => ({
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
      { description: "Available data source connector types and hints" },
      (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: jsonText({
              teamId: ctx.teamId,
              availableTypes: CONNECTOR_TYPES,
              hint: "Use the connector_list tool for live connector data.",
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
      { description: "Hint for recently indexed documents" },
      (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: jsonText({
              teamId: ctx.teamId,
              hint: "Use search_documents with a dateFrom filter for live recent documents.",
            }),
          },
        ],
      })
    );
  }

  server.resource(
    "user-context",
    "openbeam://user/context",
    { description: "Current user permissions, timezone, and locale" },
    (uri) => ({
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
    { description: "All supported connector types that can be configured" },
    (uri) => ({
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
