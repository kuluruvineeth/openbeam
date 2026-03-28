import type {
  MCPResourceDefinition,
  MCPResourceTemplate,
  ResourceHandler,
  ResourceRegistry,
} from "@openbeam/ai";
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

function jsonContents(uri: string, data: unknown) {
  return {
    contents: [
      {
        type: "resource" as const,
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data),
      },
    ],
  };
}

function errorContents(uri: string, message: string) {
  return jsonContents(uri, { error: message });
}

function handler(
  fn: (uri: string) => ReturnType<typeof jsonContents>
): ResourceHandler {
  return (uri) => Promise.resolve(fn(uri));
}

export function registerResources(
  registry: ResourceRegistry,
  ctx: McpContext
): void {
  if (hasScope(ctx, "team.read")) {
    const teamDef: MCPResourceDefinition = {
      uri: "openbeam://team",
      name: "Team Information",
      description:
        "Current team metadata including ID, plan, and configuration",
      mimeType: "application/json",
    };

    registry.register(
      teamDef,
      handler((uri) =>
        jsonContents(uri, {
          teamId: ctx.teamId,
          userId: ctx.userId,
          userEmail: ctx.userEmail,
          timezone: ctx.timezone,
          locale: ctx.locale,
        })
      )
    );
  }

  if (hasScope(ctx, "connectors.read")) {
    const connectorsDef: MCPResourceDefinition = {
      uri: "openbeam://connectors",
      name: "Connected Sources",
      description:
        "List of all active data source connectors and their sync status",
      mimeType: "application/json",
    };

    registry.register(
      connectorsDef,
      handler((uri) =>
        jsonContents(uri, {
          teamId: ctx.teamId,
          availableTypes: CONNECTOR_TYPES,
          hint: "Use the list_connectors tool to get live connector data with sync status.",
        })
      )
    );

    const connectorTemplate: MCPResourceTemplate = {
      uriTemplate: "openbeam://connectors/{connectorId}",
      name: "Connector Detail",
      description:
        "Detailed information about a specific connector including configuration and sync history",
      mimeType: "application/json",
    };

    registry.registerTemplate(
      connectorTemplate,
      handler((uri) => {
        const connectorId = uri.split("/").pop();
        if (!connectorId) {
          return errorContents(uri, "Connector ID is required");
        }
        return jsonContents(uri, {
          connectorId,
          teamId: ctx.teamId,
          hint: "Use the get_connector tool with this connector ID for live data.",
        });
      })
    );

    const syncHistoryTemplate: MCPResourceTemplate = {
      uriTemplate: "openbeam://connectors/{connectorId}/sync-history",
      name: "Connector Sync History",
      description:
        "Recent sync history for a specific connector with timestamps and document counts",
      mimeType: "application/json",
    };

    registry.registerTemplate(
      syncHistoryTemplate,
      handler((uri) => {
        const parts = uri.split("/");
        const connectorIdx = parts.indexOf("connectors");
        const connectorId =
          connectorIdx >= 0 ? parts[connectorIdx + 1] : undefined;

        if (!connectorId) {
          return errorContents(uri, "Connector ID is required");
        }
        return jsonContents(uri, {
          connectorId,
          teamId: ctx.teamId,
          hint: "Use the connector_sync_history tool for live sync history data.",
        });
      })
    );
  }

  if (hasScope(ctx, "documents.read")) {
    const recentDocsDef: MCPResourceDefinition = {
      uri: "openbeam://documents/recent",
      name: "Recent Documents",
      description: "Documents indexed in the last 24 hours across all sources",
      mimeType: "application/json",
    };

    registry.register(
      recentDocsDef,
      handler((uri) =>
        jsonContents(uri, {
          teamId: ctx.teamId,
          hint: "Use the search_documents tool with a time filter for live recent documents.",
        })
      )
    );

    const documentTemplate: MCPResourceTemplate = {
      uriTemplate: "openbeam://documents/{documentId}",
      name: "Document",
      description: "Full content of a specific document by ID with metadata",
      mimeType: "application/json",
    };

    registry.registerTemplate(
      documentTemplate,
      handler((uri) => {
        const documentId = uri.split("/").pop();
        if (!documentId) {
          return errorContents(uri, "Document ID is required");
        }
        return jsonContents(uri, {
          documentId,
          teamId: ctx.teamId,
          hint: "Use the get_document tool with this document ID for full content.",
        });
      })
    );
  }

  if (hasScope(ctx, "search.read")) {
    const searchTemplate: MCPResourceTemplate = {
      uriTemplate: "openbeam://search/{queryId}",
      name: "Search Results",
      description:
        "Cached search results for a specific query ID with relevance scores",
      mimeType: "application/json",
    };

    registry.registerTemplate(
      searchTemplate,
      handler((uri) => {
        const queryId = uri.split("/").pop();
        if (!queryId) {
          return errorContents(uri, "Query ID is required");
        }
        return jsonContents(uri, {
          queryId,
          teamId: ctx.teamId,
          hint: "Use the search_documents tool to perform a new search.",
        });
      })
    );
  }

  const userContextDef: MCPResourceDefinition = {
    uri: "openbeam://user/context",
    name: "User Context",
    description:
      "Current user context including permissions, timezone, and locale",
    mimeType: "application/json",
  };

  registry.register(
    userContextDef,
    handler((uri) =>
      jsonContents(uri, {
        userId: ctx.userId,
        userEmail: ctx.userEmail,
        scopes: ctx.scopes,
        timezone: ctx.timezone,
        locale: ctx.locale,
      })
    )
  );

  const connectorTypesDef: MCPResourceDefinition = {
    uri: "openbeam://connector-types",
    name: "Available Connector Types",
    description: "List of all supported connector types that can be configured",
    mimeType: "application/json",
  };

  registry.register(
    connectorTypesDef,
    handler((uri) =>
      jsonContents(uri, {
        types: CONNECTOR_TYPES.map((type) => ({
          id: type,
          name: type
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" "),
        })),
      })
    )
  );
}
