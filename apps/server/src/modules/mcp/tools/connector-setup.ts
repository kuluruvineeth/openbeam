import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import db, {
  createConnector,
  createSetupSession,
  expireSetupSession,
  findConnectorById,
  getConnectorsWithStats,
  getSetupSession,
  updateConnector,
} from "@openbeam/db";
import { appStore } from "@openbeam/integrations";
import { z } from "zod";
import { sanitizeArray } from "../mcp.sanitize";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
  WRITE_ANNOTATIONS,
} from "../mcp.types";
import { truncateListResponse, withErrorHandling } from "../mcp.utils";

const SETUP_TTL_MS = 15 * 60 * 1000;
const API_URL = process.env.OPENBEAM_API_URL || "https://api.openbeam.work";
const WEB_URL = process.env.OPENBEAM_WEB_URL || "https://app.openbeam.work";

const mcpAvailableSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  shortDescription: z.string().nullable(),
  authType: z.string(),
  active: z.boolean(),
  installed: z.boolean(),
});

export const registerConnectorSetupTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "connectors.read")) {
    return;
  }

  registerAppTool(
    server,
    "connector_available",
    {
      title: "Available Connectors",
      description:
        "Browse all 103+ connectors that can be set up. Filter by category, auth type, or search by name. Use this BEFORE connector_setup (OAuth) or connector_configure (API key) to discover what's available.\n\nReturns: name, category, auth type (OAUTH2/API_KEY). Common categories: Communication, Project Management, Storage, Development, CRM, Security, HR, Analytics.",
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe("Filter by category (e.g. Communication, CRM, Storage)"),
        authType: z
          .enum(["OAUTH2", "API_KEY", "SERVICE_ACCOUNT", "PUBLIC_DATASET"])
          .optional()
          .describe("Filter by auth type"),
        query: z.string().optional().describe("Search by name"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
      _meta: { ui: { resourceUri: "ui://openbeam/connector-setup" } },
    },
    withErrorHandling(async (params) => {
      const teamConnectors = await getConnectorsWithStats(db, ctx.teamId);
      const installedTypes = new Set(teamConnectors.map((c) => c.app));

      let filtered = appStore.filter((a) => a.active);

      if (params.category) {
        const cat = params.category.toLowerCase();
        filtered = filtered.filter((a) =>
          a.category.toLowerCase().includes(cat)
        );
      }

      if (params.authType) {
        filtered = filtered.filter((a) => a.auth.type === params.authType);
      }

      if (params.query) {
        const q = params.query.toLowerCase();
        filtered = filtered.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.category.toLowerCase().includes(q) ||
            (a.short_description?.toLowerCase().includes(q) ?? false)
        );
      }

      const data = filtered.map((app) => ({
        id: app.id,
        name: app.name,
        category: app.category,
        shortDescription: app.short_description ?? null,
        authType: app.auth.type,
        active: app.active,
        installed: installedTypes.has(app.id),
      }));

      const sanitized = sanitizeArray(mcpAvailableSchema, data);
      const categories = [...new Set(appStore.map((a) => a.category))].sort();

      const rows = sanitized
        .map(
          (c) =>
            `• ${c.name} (${c.category}) — ${c.authType}${c.installed ? " [installed]" : ""}`
        )
        .join("\n");

      const text = [
        `Found ${sanitized.length} connectors:`,
        "",
        rows,
        "",
        "To connect OAuth connector: use connector_setup.",
        "To connect API key connector: use connector_configure.",
        `Categories: ${categories.join(", ")}`,
      ].join("\n");

      const response = {
        meta: { totalResults: sanitized.length, hasNextPage: false },
        data: sanitized,
      };
      const { structuredContent } = truncateListResponse(response);

      return {
        content: [{ type: "text" as const, text }],
        structuredContent,
      };
    }, "Failed to list available connectors")
  );

  if (!hasScope(ctx, "connectors.write")) {
    return;
  }

  registerAppTool(
    server,
    "connector_setup",
    {
      title: "Set Up Connector (OAuth)",
      description:
        "Start OAuth setup for a connector (Slack, Gmail, GitHub, Notion, Linear, Jira, etc.). Returns a URL the user must open in their browser to authorize.\n\nAfter the user authorizes, call connector_setup_status to check completion. Use connector_available first to verify the connector uses OAuth.\n\nFor API key connectors, use connector_configure instead.",
      inputSchema: {
        app: z
          .string()
          .describe("Connector type (e.g. SLACK, GMAIL, GITHUB, NOTION)"),
        name: z.string().optional().describe("Display name for the connector"),
      },
      annotations: WRITE_ANNOTATIONS,
      _meta: { ui: { resourceUri: "ui://openbeam/connector-setup" } },
    },
    withErrorHandling(async (params) => {
      const appType = params.app.toUpperCase();
      const app = appStore.find((a) => a.id === appType);

      if (!app) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Unknown connector: ${params.app}. Use connector_available to browse.`,
            },
          ],
          isError: true,
        };
      }

      if (app.auth.type !== "OAUTH2") {
        return {
          content: [
            {
              type: "text" as const,
              text: `${app.name} uses ${app.auth.type}, not OAuth. Use connector_configure instead.`,
            },
          ],
          isError: true,
        };
      }

      const existing = await getConnectorsWithStats(db, ctx.teamId);
      const alreadyConnected = existing.find(
        (c) =>
          c.app === appType && (c.status === "ACTIVE" || c.status === "SYNCING")
      );
      if (alreadyConnected) {
        return {
          content: [
            {
              type: "text" as const,
              text: `${app.name} is already connected (ID: ${alreadyConnected.id}). Use sync_trigger to sync or connector_disconnect to remove it first.`,
            },
          ],
          structuredContent: {
            connectorId: alreadyConnected.id,
            status: "already_connected",
          },
        };
      }

      const staleConnecting = existing.filter(
        (c) => c.app === appType && c.status === "CONNECTING"
      );
      for (const stale of staleConnecting) {
        await updateConnector(db, stale.id, { status: "INACTIVE" });
      }

      const connector = await createConnector(db, {
        teamId: ctx.teamId,
        userId: ctx.userId,
        workspaceExternalId: ctx.teamId,
        app: appType as Parameters<typeof createConnector>[1]["app"],
        name: params.name ?? app.name,
        type: "SOURCE",
        authType: "OAUTH2",
        config: {},
      });

      const expiresAt = new Date(Date.now() + SETUP_TTL_MS);

      const session = await createSetupSession(db, {
        teamId: ctx.teamId,
        userId: ctx.userId,
        appType: appType as Parameters<typeof createConnector>[1]["app"],
        expiresAt,
      });

      const slug = appType.toLowerCase().replace(/_/g, "-");
      const redirectUrl = `${WEB_URL}/connectors/setup/complete?sessionId=${session.id}`;
      const oauthUrl = `${API_URL}/api/integrations/${slug}/oauth/start?connectorId=${connector.id}&workspaceId=${ctx.teamId}&redirectUrl=${encodeURIComponent(redirectUrl)}`;

      const text = [
        `Open this URL in your browser to connect ${app.name}:`,
        "",
        oauthUrl,
        "",
        `After authorizing, use connector_setup_status with setupId "${session.id}" to verify.`,
        "This link expires in 15 minutes.",
      ].join("\n");

      return {
        content: [{ type: "text" as const, text }],
        structuredContent: {
          setupId: session.id,
          connectorId: connector.id,
          oauthUrl,
          app: { id: app.id, name: app.name },
          expiresAt: expiresAt.toISOString(),
        },
      };
    }, "Failed to start connector setup")
  );

  server.registerTool(
    "connector_setup_status",
    {
      title: "Check Setup Status",
      description:
        "Check whether an OAuth connector setup has completed. Call after the user opens the authorization URL from connector_setup.\n\nReturns: pending, completed (with connectorId), failed, or expired. If completed, use sync_trigger to start syncing data.",
      inputSchema: {
        setupId: z.string().describe("Setup ID from connector_setup"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async ({ setupId }) => {
      const session = await getSetupSession(db, setupId, ctx.teamId);

      if (!session) {
        return {
          content: [
            { type: "text" as const, text: "Setup session not found." },
          ],
          isError: true,
        };
      }

      if (session.status === "PENDING" && session.expiresAt < new Date()) {
        await expireSetupSession(db, setupId);
        return {
          content: [
            {
              type: "text" as const,
              text: "Setup expired. Start a new one with connector_setup.",
            },
          ],
          structuredContent: { status: "expired" },
        };
      }

      if (session.status === "COMPLETED" && session.connectorId) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Setup complete! Connector ID: ${session.connectorId}. Use sync_trigger to start syncing.`,
            },
          ],
          structuredContent: {
            status: "completed",
            connectorId: session.connectorId,
          },
        };
      }

      if (session.status === "FAILED") {
        return {
          content: [
            {
              type: "text" as const,
              text: `Setup failed: ${session.errorMessage ?? "Unknown error"}. Try again with connector_setup.`,
            },
          ],
          structuredContent: {
            status: "failed",
            error: session.errorMessage,
          },
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: "Setup is still pending. The user needs to complete authorization in their browser.",
          },
        ],
        structuredContent: { status: "pending" },
      };
    }, "Failed to check setup status")
  );

  server.registerTool(
    "connector_disconnect",
    {
      title: "Disconnect Connector",
      description:
        "Deactivate a connector. Stops syncing and removes credentials. Indexed documents are preserved.\n\nUse connector_list to find the connector ID. Confirm with the user before disconnecting.",
      inputSchema: {
        connectorId: z.string().describe("Connector ID to disconnect"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withErrorHandling(async ({ connectorId }) => {
      const connector = await findConnectorById(db, connectorId);

      if (!connector || connector.teamId !== ctx.teamId) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Connector not found or access denied.",
            },
          ],
          isError: true,
        };
      }

      await updateConnector(db, connectorId, { status: "INACTIVE" });

      return {
        content: [
          {
            type: "text" as const,
            text: `Disconnected ${connector.name}. Indexed documents are preserved.`,
          },
        ],
        structuredContent: {
          connectorId,
          name: connector.name,
          status: "disconnected",
        },
      };
    }, "Failed to disconnect connector")
  );
};
