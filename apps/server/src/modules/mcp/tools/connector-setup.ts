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
import {
  AirtableAuth,
  AsanaAuth,
  BitbucketAuth,
  BoxAuth,
  CanvaAuth,
  ClickUpAuth,
  ConfluenceAuth,
  DocuSignAuth,
  DropboxAuth,
  FigmaAuth,
  GitHubAuth,
  GitLabAuth,
  GmailAuth,
  GoogleCalendarAuth,
  GoogleChatAuth,
  GoogleDriveAuth,
  HubSpotAuth,
  IntercomAuth,
  JiraAuth,
  LinearAuth,
  MiroAuth,
  MondayAuth,
  NotionAuth,
  OutlookAuth,
  PipedriveAuth,
  SalesforceAuth,
  SlackAuth,
  ZendeskAuth,
  ZoomAuth,
} from "@openbeam/services";
import { z } from "zod";
import { sanitizeArray } from "../mcp.sanitize";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
  WRITE_ANNOTATIONS,
} from "../mcp.types";
import { truncateListResponse, withErrorHandling } from "../mcp.utils";

const AUTH_MAP: Record<
  string,
  new () => {
    start(ctx: {
      user: { id: string };
      workspaceId: string;
      connectorId: string;
      redirectUrl: string;
    }): Promise<string>;
  }
> = {
  AIRTABLE: AirtableAuth,
  ASANA: AsanaAuth,
  BITBUCKET: BitbucketAuth,
  BOX: BoxAuth,
  CANVA: CanvaAuth,
  CLICKUP: ClickUpAuth,
  CONFLUENCE: ConfluenceAuth,
  DOCUSIGN: DocuSignAuth,
  DROPBOX: DropboxAuth,
  FIGMA: FigmaAuth,
  GITHUB: GitHubAuth,
  GITLAB: GitLabAuth,
  GMAIL: GmailAuth,
  GOOGLE_CALENDAR: GoogleCalendarAuth,
  GOOGLE_CHAT: GoogleChatAuth,
  GOOGLE_DRIVE: GoogleDriveAuth,
  HUBSPOT: HubSpotAuth,
  INTERCOM: IntercomAuth,
  JIRA: JiraAuth,
  LINEAR: LinearAuth,
  MIRO: MiroAuth,
  MONDAY: MondayAuth,
  NOTION: NotionAuth,
  OUTLOOK: OutlookAuth,
  PIPEDRIVE: PipedriveAuth,
  SALESFORCE: SalesforceAuth,
  SLACK: SlackAuth,
  ZENDESK: ZendeskAuth,
  ZOOM: ZoomAuth,
};

const SETUP_TTL_MS = 15 * 60 * 1000;
const WEB_URL = process.env.OPENBEAM_WEB_URL || "https://app.openbeam.work";

const mcpAvailableSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  shortDescription: z.string().nullable(),
  authType: z.string(),
  active: z.boolean(),
  installed: z.boolean(),
  requiredFields: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        type: z.string(),
        required: z.boolean(),
        placeholder: z.string().nullable().optional(),
      })
    )
    .optional(),
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
        "Browse the full catalog of 103+ available data source connectors that can be set up for the team. Use this BEFORE connector_setup or connector_configure to discover which connectors exist, what authentication method they require, and whether they are already installed. This is the starting point when the user wants to connect a new data source.\n\nReturns each connector's: ID (used in connector_setup and connector_configure), display name, category (e.g. 'Communication', 'Project Management', 'Storage', 'Development', 'CRM', 'Security', 'HR', 'Analytics'), short description, authentication type ('OAUTH2', 'API_KEY', 'SERVICE_ACCOUNT', 'PUBLIC_DATASET'), whether it is already installed for this team, and for non-OAuth connectors, the required credential fields (field ID, label, type, and whether it is required).\n\nFilter by category to narrow results (e.g. 'CRM' to see Salesforce, HubSpot, Pipedrive), by authType to see only OAuth or API key connectors, or by query to search by name. After finding the connector you want: use connector_setup for OAuth connectors (Slack, Gmail, GitHub, Notion, etc.) or connector_configure for API key connectors (Samsara, Datadog, Jenkins, etc.).\n\nDo NOT use this to check the status of already-connected connectors — use connector_list for that.",
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe(
            "Filter connectors by category. Common values: 'Communication' (Slack, Gmail, Teams), 'Project Management' (Jira, Linear, Asana), 'Storage' (Google Drive, Dropbox, Box), 'Development' (GitHub, GitLab, Bitbucket), 'CRM' (Salesforce, HubSpot, Pipedrive), 'Security', 'HR', 'Analytics'. Case-insensitive partial match."
          ),
        authType: z
          .enum(["OAUTH2", "API_KEY", "SERVICE_ACCOUNT", "PUBLIC_DATASET"])
          .optional()
          .describe(
            "Filter by authentication type. 'OAUTH2' = browser-based authorization flow (most SaaS tools). 'API_KEY' = requires a token or API key from the service. 'SERVICE_ACCOUNT' = service account credentials. 'PUBLIC_DATASET' = no auth required."
          ),
        query: z
          .string()
          .optional()
          .describe(
            "Search connectors by name or description. Examples: 'slack', 'google', 'project management'. Case-insensitive partial match."
          ),
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
        requiredFields:
          app.auth.type !== "OAUTH2"
            ? (app.settings ?? [])
                .filter((s) => s.required)
                .map((s) => ({
                  id: s.id,
                  label: s.label,
                  type: s.type,
                  required: s.required,
                  placeholder: s.placeholder ?? null,
                }))
            : undefined,
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
        "Start the OAuth authorization flow for a connector that uses OAuth2 authentication (Slack, Gmail, GitHub, Notion, Linear, Jira, Google Drive, Confluence, Figma, and many others). This creates a new connector record and generates an authorization URL that the user must open in their browser to grant access.\n\nReturns: a setup session ID (needed for connector_setup_status), the new connector's ID, the OAuth authorization URL the user must visit, the app name, and an expiration timestamp (15 minutes). Present the URL to the user and instruct them to open it in their browser. The authorization flow happens entirely in the browser — you cannot complete it programmatically.\n\nAfter the user reports they have authorized (or after a reasonable wait), call connector_setup_status with the returned setupId to check whether authorization succeeded. If it succeeded, use sync_trigger with the connector ID to start the first data sync. Use connector_available first to verify the connector exists and uses OAuth2 — if the connector uses API_KEY auth, use connector_configure instead.\n\nDo NOT call this for connectors that are already connected and active — it will return an error. Use connector_list to check existing connections first.",
      inputSchema: {
        app: z
          .string()
          .describe(
            "Connector type identifier in UPPER_SNAKE_CASE. Examples: 'SLACK', 'GMAIL', 'GITHUB', 'NOTION', 'LINEAR', 'JIRA', 'CONFLUENCE', 'GOOGLE_DRIVE', 'GOOGLE_CALENDAR', 'FIGMA', 'DROPBOX', 'HUBSPOT', 'SALESFORCE', 'ZOOM'. Get the full list from connector_available."
          ),
        name: z
          .string()
          .optional()
          .describe(
            "Optional display name for the connector. Defaults to the app's standard name (e.g. 'Slack', 'GitHub'). Useful when connecting multiple instances of the same app."
          ),
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
      const redirectUrl = `${WEB_URL}/connectors/setup/${slug}/oauth/callback`;

      const AuthClass = AUTH_MAP[appType];
      if (!AuthClass) {
        return {
          content: [
            {
              type: "text" as const,
              text: `OAuth setup for ${app.name} is not supported yet via MCP.`,
            },
          ],
          isError: true,
        };
      }

      const auth = new AuthClass();
      const oauthUrl = await auth.start({
        user: { id: ctx.userId },
        workspaceId: ctx.teamId,
        connectorId: connector.id,
        redirectUrl,
      });

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
        "Check whether an OAuth connector setup has completed after the user visited the authorization URL from connector_setup. Call this after the user confirms they have authorized the app in their browser, or poll it periodically to detect when authorization completes.\n\nReturns one of four statuses: 'pending' (user has not yet completed authorization — ask them to open the URL), 'completed' (authorization succeeded — includes the connector ID, ready for sync_trigger), 'failed' (authorization failed — includes error message, suggest retrying with connector_setup), or 'expired' (the 15-minute setup window elapsed — start a new setup with connector_setup).\n\nThe setupId parameter comes from the connector_setup response. After a 'completed' status, use sync_trigger with the returned connectorId to start the first data sync. Do NOT call this without first calling connector_setup — the setupId only exists after initiating an OAuth flow.",
      inputSchema: {
        setupId: z
          .string()
          .describe(
            "The setup session ID returned by connector_setup in the structuredContent.setupId field."
          ),
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
    "connector_configure",
    {
      title: "Configure Connector (API Key)",
      description:
        "Set up a connector that uses API key, token, or service account authentication (Samsara, Datadog, Jenkins, BambooHR, PagerDuty, and similar services). This creates the connector, validates the required fields are present, and activates it immediately — no browser authorization step needed unlike OAuth connectors.\n\nReturns the new connector's ID and 'active' status on success. If required fields are missing, returns an error listing the missing field IDs and labels. The credentials object keys must exactly match the setting IDs shown in connector_available's requiredFields array for that connector type.\n\nUse connector_available FIRST to discover which fields are required for the target connector — each connector has different required fields (e.g. Samsara needs 'api_token', Datadog needs 'api_key' and 'app_key'). After successful configuration, use sync_trigger with the returned connector ID to start the first data sync.\n\nDo NOT use this for OAuth connectors (Slack, Gmail, GitHub, Notion, etc.) — use connector_setup instead. If the connector is already connected, this returns an error — use connector_list to check existing connections first.",
      inputSchema: {
        app: z
          .string()
          .describe(
            "Connector type identifier in UPPER_SNAKE_CASE. Examples: 'SAMSARA', 'DATADOG', 'JENKINS', 'BAMBOOHR', 'PAGERDUTY', 'AWS_IOT_CORE'. Get the full list from connector_available with authType='API_KEY'."
          ),
        credentials: z
          .record(z.string(), z.unknown())
          .describe(
            "Key-value pairs where keys are the setting IDs from connector_available's requiredFields array, and values are the user's credentials. Example for Samsara: { api_token: 'samsara_api_xxxx' }. Example for Datadog: { api_key: 'dd_xxx', app_key: 'dd_app_xxx', site: 'datadoghq.com' }."
          ),
        name: z
          .string()
          .optional()
          .describe(
            "Optional display name for the connector. Defaults to the app's standard name. Useful when connecting multiple instances."
          ),
      },
      annotations: WRITE_ANNOTATIONS,
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

      if (app.auth.type === "OAUTH2") {
        return {
          content: [
            {
              type: "text" as const,
              text: `${app.name} uses OAuth. Use connector_setup instead.`,
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
              text: `${app.name} is already connected (ID: ${alreadyConnected.id}).`,
            },
          ],
          structuredContent: {
            connectorId: alreadyConnected.id,
            status: "already_connected",
          },
        };
      }

      const requiredSettings = (app.settings ?? []).filter((s) => s.required);
      const missingFields = requiredSettings
        .filter((s) => !(s.id in params.credentials))
        .map((s) => `${s.id} (${s.label})`);

      if (missingFields.length > 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Missing required fields: ${missingFields.join(", ")}`,
            },
          ],
          isError: true,
        };
      }

      const connector = await createConnector(db, {
        teamId: ctx.teamId,
        userId: ctx.userId,
        workspaceExternalId: ctx.teamId,
        app: appType as Parameters<typeof createConnector>[1]["app"],
        name: params.name ?? app.name,
        type: "SOURCE",
        authType: app.auth.type as Parameters<
          typeof createConnector
        >[1]["authType"],
        config: params.credentials,
      });

      await updateConnector(db, connector.id, { status: "ACTIVE" });

      return {
        content: [
          {
            type: "text" as const,
            text: `${app.name} configured and activated (ID: ${connector.id}). Use sync_trigger to start syncing.`,
          },
        ],
        structuredContent: { connectorId: connector.id, status: "active" },
      };
    }, "Failed to configure connector")
  );

  server.registerTool(
    "connector_disconnect",
    {
      title: "Disconnect Connector",
      description:
        "Deactivate and disconnect a connector, stopping all future syncs and revoking stored credentials. Previously indexed documents are preserved in the search index and remain searchable — this only stops new data from being synced. Use this when the user wants to remove a data source integration or when a connector is persistently failing and needs to be reconnected from scratch.\n\nReturns the disconnected connector's ID, name, and 'disconnected' status on success. This is a destructive action — always confirm with the user before proceeding, as reconnecting will require re-authorizing (OAuth) or re-entering credentials (API key).\n\nUse connector_list to find the connector ID. After disconnecting, the user can reconnect the same service using connector_setup (OAuth) or connector_configure (API key). Do NOT use this to pause a sync temporarily — there is no 'pause' action; disconnecting fully removes the credential link.",
      inputSchema: {
        connectorId: z
          .string()
          .describe(
            "The ID of the connector to disconnect. Get this from connector_list results."
          ),
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
