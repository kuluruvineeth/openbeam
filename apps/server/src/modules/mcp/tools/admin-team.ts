import { randomBytes } from "node:crypto";
import db, { TeamRole } from "@openbeam/db";
import { z } from "zod";
import {
  formatInviteSent,
  formatMcpConfig,
  formatMemberRemoved,
  formatRoleUpdated,
} from "../formatters";
import { sanitize } from "../mcp.sanitize";
import {
  DESTRUCTIVE_ANNOTATIONS,
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
  WRITE_ANNOTATIONS,
} from "../mcp.types";
import { withErrorHandling } from "../mcp.utils";

const MCP_SERVER_URL =
  process.env.MCP_SERVER_URL ?? "https://api.openbeam.work/mcp";

const MCP_CLIENTS = [
  "claude-desktop",
  "claude-code",
  "cursor",
  "windsurf",
  "vscode",
  "codex",
  "chatgpt",
  "cline",
  "continue",
  "opencode",
] as const;

type McpClientId = (typeof MCP_CLIENTS)[number];

function generateConfig(client: McpClientId, apiKey: string): string {
  const url = MCP_SERVER_URL;

  switch (client) {
    case "claude-desktop":
      return [
        "1. Open Claude Desktop → Settings → Connectors",
        '2. Click "Add custom connector"',
        "3. Name: OpenBeam",
        `4. Remote MCP server URL: ${url}`,
        "5. Click Add — OAuth will handle authentication automatically",
      ].join("\n");

    case "claude-code":
      return `claude mcp add --transport http openbeam ${url} --header "Authorization: Bearer ${apiKey}"`;

    case "cursor":
      return JSON.stringify(
        {
          mcpServers: {
            openbeam: {
              url,
              headers: { Authorization: `Bearer ${apiKey}` },
            },
          },
        },
        null,
        2
      );

    case "windsurf":
      return JSON.stringify(
        {
          mcpServers: {
            openbeam: {
              serverUrl: url,
              headers: { Authorization: `Bearer ${apiKey}` },
            },
          },
        },
        null,
        2
      );

    case "vscode":
      return JSON.stringify(
        {
          servers: {
            openbeam: {
              type: "http",
              url,
              headers: { Authorization: `Bearer ${apiKey}` },
            },
          },
        },
        null,
        2
      );

    case "cline":
      return JSON.stringify(
        {
          mcpServers: {
            openbeam: {
              url,
              headers: { Authorization: `Bearer ${apiKey}` },
            },
          },
        },
        null,
        2
      );

    case "codex":
      return `codex --mcp-server openbeam=${url} --mcp-header openbeam="Authorization: Bearer ${apiKey}"`;

    case "chatgpt":
      return [
        "1. Enable Developer Mode: Workspace Settings → Permissions → Developer mode",
        "2. Go to Settings → Apps & Connectors → Advanced → Developer Mode",
        `3. Add MCP server URL: ${url}`,
        "4. OAuth will handle authentication automatically",
        "",
        "Requires ChatGPT Business, Enterprise, or Education plan.",
      ].join("\n");

    case "continue":
      return JSON.stringify(
        {
          mcpServers: [
            {
              name: "openbeam",
              transport: { type: "streamable-http", url },
              headers: { Authorization: `Bearer ${apiKey}` },
            },
          ],
        },
        null,
        2
      );

    case "opencode":
      return JSON.stringify(
        {
          mcp: {
            openbeam: {
              type: "remote",
              url,
              headers: { Authorization: `Bearer ${apiKey}` },
            },
          },
        },
        null,
        2
      );

    default: {
      const _exhaustive: never = client;
      return _exhaustive;
    }
  }
}

const CONFIG_PATHS: Partial<Record<McpClientId, string>> = {
  cursor: ".cursor/mcp.json",
  windsurf: "~/.codeium/windsurf/mcp_config.json",
  vscode: ".vscode/mcp.json",
  continue: "~/.continue/config.json",
};

const mcpInviteSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  code: z.string(),
  createdAt: z.string().nullable().optional(),
});

const mcpRoleUpdateSchema = z.object({
  userId: z.string(),
  role: z.string(),
});

const mcpConfigSchema = z.object({
  client: z.string(),
  config: z.string(),
  configPath: z.string().nullable().optional(),
  apiKeyHint: z.string(),
});

export const registerAdminTeamTools: RegisterTools = (server, ctx) => {
  if (hasScope(ctx, "teams.write")) {
    server.registerTool(
      "team_invite_member",
      {
        title: "Invite Team Member",
        description:
          "Invite a new member to the team by email address. Creates an invite record with a unique code. Use this when a user wants to add someone to their OpenBeam team.\n\nParams: email (required), role (optional: ADMIN or MEMBER, defaults to MEMBER).\n\nReturns the invite record with code. The invited user will need this code to join.\n\nDo NOT use this to change an existing member's role — use team_update_role instead.",
        inputSchema: {
          email: z
            .string()
            .email()
            .describe("Email address of the person to invite"),
          role: z
            .enum(["ADMIN", "MEMBER"])
            .optional()
            .default("MEMBER")
            .describe("Role for the invited member: ADMIN or MEMBER"),
        },
        annotations: WRITE_ANNOTATIONS,
      },
      withErrorHandling(async (params) => {
        const existing = await db.userInvite.findUnique({
          where: {
            teamId_email: {
              teamId: ctx.teamId,
              email: params.email,
            },
          },
        });

        if (existing) {
          return {
            content: [
              {
                type: "text" as const,
                text: `An invite already exists for ${params.email}. Use team_members to check if they've already joined.`,
              },
            ],
            isError: true,
          };
        }

        const existingMember = await db.usersOnTeam.findFirst({
          where: {
            teamId: ctx.teamId,
            user: { email: params.email },
          },
        });

        if (existingMember) {
          return {
            content: [
              {
                type: "text" as const,
                text: `${params.email} is already a member of this team. Use team_update_role to change their role.`,
              },
            ],
            isError: true,
          };
        }

        const code = randomBytes(16).toString("hex");
        const role = params.role === "ADMIN" ? TeamRole.ADMIN : TeamRole.MEMBER;

        const invite = await db.userInvite.create({
          data: {
            teamId: ctx.teamId,
            email: params.email,
            role,
            code,
            invitedBy: ctx.userId,
          },
        });

        const clean = sanitize(mcpInviteSchema, {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          code: invite.code,
          createdAt: invite.createdAt.toISOString(),
        });

        return {
          content: [{ type: "text" as const, text: formatInviteSent(clean) }],
          structuredContent: { data: clean },
        };
      }, "Failed to invite team member")
    );

    server.registerTool(
      "team_update_role",
      {
        title: "Update Member Role",
        description:
          "Change the role of an existing team member. Use this when a user wants to promote or demote a team member.\n\nParams: userId (required), role (required: OWNER, ADMIN, or MEMBER).\n\nReturns the updated membership record.\n\nTo find a member's userId, call team_members first. Do NOT use this for invites — use team_invite_member instead.",
        inputSchema: {
          userId: z
            .string()
            .describe(
              "The user ID of the member to update (from team_members)"
            ),
          role: z
            .enum(["OWNER", "ADMIN", "MEMBER"])
            .describe("New role: OWNER, ADMIN, or MEMBER"),
        },
        annotations: WRITE_ANNOTATIONS,
      },
      withErrorHandling(async (params) => {
        const membership = await db.usersOnTeam.findUnique({
          where: {
            userId_teamId: {
              userId: params.userId,
              teamId: ctx.teamId,
            },
          },
        });

        if (!membership) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Member not found on this team. Use team_members to list current members.",
              },
            ],
            isError: true,
          };
        }

        const role = TeamRole[params.role as keyof typeof TeamRole];

        await db.usersOnTeam.update({
          where: { id: membership.id },
          data: { role },
        });

        const clean = sanitize(mcpRoleUpdateSchema, {
          userId: params.userId,
          role: params.role,
        });

        return {
          content: [{ type: "text" as const, text: formatRoleUpdated(clean) }],
          structuredContent: { data: clean },
        };
      }, "Failed to update member role")
    );
  }

  if (hasScope(ctx, "teams.write")) {
    server.registerTool(
      "team_remove_member",
      {
        title: "Remove Team Member",
        description:
          "Remove a member from the team. This is destructive and cannot be undone — the user will lose access to all team data.\n\nParams: userId (required).\n\nTo find a member's userId, call team_members first. Cannot remove the last OWNER — transfer ownership first using team_update_role.",
        inputSchema: {
          userId: z
            .string()
            .describe(
              "The user ID of the member to remove (from team_members)"
            ),
        },
        annotations: DESTRUCTIVE_ANNOTATIONS,
      },
      withErrorHandling(async (params) => {
        if (params.userId === ctx.userId) {
          return {
            content: [
              {
                type: "text" as const,
                text: "You cannot remove yourself from the team. Ask another admin to remove you, or transfer ownership first.",
              },
            ],
            isError: true,
          };
        }

        const membership = await db.usersOnTeam.findUnique({
          where: {
            userId_teamId: {
              userId: params.userId,
              teamId: ctx.teamId,
            },
          },
          include: { user: { select: { email: true, name: true } } },
        });

        if (!membership) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Member not found on this team. Use team_members to list current members.",
              },
            ],
            isError: true,
          };
        }

        if (membership.role === TeamRole.OWNER) {
          const ownerCount = await db.usersOnTeam.count({
            where: { teamId: ctx.teamId, role: TeamRole.OWNER },
          });

          if (ownerCount <= 1) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "Cannot remove the last owner. Transfer ownership to another member first using team_update_role.",
                },
              ],
              isError: true,
            };
          }
        }

        await db.usersOnTeam.delete({ where: { id: membership.id } });

        const displayName =
          membership.user?.name ?? membership.user?.email ?? params.userId;

        return {
          content: [
            {
              type: "text" as const,
              text: formatMemberRemoved(displayName),
            },
          ],
          structuredContent: {
            data: { userId: params.userId, removed: true },
          },
        };
      }, "Failed to remove team member")
    );
  }

  if (hasScope(ctx, "apikeys.read")) {
    server.registerTool(
      "mcp_config_generate",
      {
        title: "Generate MCP Client Config",
        description:
          "Generate the MCP client configuration for a specific AI coding tool or assistant. Use this when a user asks how to connect OpenBeam to their IDE, AI assistant, or coding tool.\n\nReturns the exact JSON/command the user should paste into their client's config file. Includes the config file path where applicable.\n\nNote: For Claude Desktop, authentication is via OAuth (no API key needed). For all other clients, an API key is embedded in the config. If no API key is available, the config will include a placeholder.\n\nSupported clients: claude-desktop, claude-code, cursor, windsurf, vscode, codex, chatgpt, cline, continue, opencode.",
        inputSchema: {
          client: z
            .enum(MCP_CLIENTS)
            .describe(
              "Target MCP client: claude-desktop, claude-code, cursor, windsurf, vscode, codex, chatgpt, cline, continue, or opencode"
            ),
        },
        annotations: READ_ONLY_ANNOTATIONS,
      },
      withErrorHandling(async (params) => {
        const clientId = params.client as McpClientId;

        const apiKeys = await db.apiKey.findMany({
          where: { teamId: ctx.teamId, revoked: false },
          orderBy: { lastUsedAt: "desc" },
          take: 1,
          select: { prefix: true },
        });

        const apiKey = apiKeys[0]
          ? `${apiKeys[0].prefix}...`
          : "<YOUR_API_KEY>";
        const config = generateConfig(clientId, apiKey);
        const configPath = CONFIG_PATHS[clientId] ?? null;

        const clean = sanitize(mcpConfigSchema, {
          client: clientId,
          config,
          configPath,
          apiKeyHint:
            apiKeys.length > 0
              ? "Using your most recently used API key."
              : "No active API key found. Create one with apikey_create, then re-run this tool.",
        });

        return {
          content: [{ type: "text" as const, text: formatMcpConfig(clean) }],
          structuredContent: { data: clean },
        };
      }, "Failed to generate MCP config")
    );
  }
};
