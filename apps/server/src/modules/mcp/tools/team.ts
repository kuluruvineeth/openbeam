import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import db, { getTeamWithCounts, listTeamMembers } from "@openbeam/db";
import { z } from "zod";
import { formatTeamInfo, formatTeamMembers } from "../formatters";
import { sanitize, sanitizeArray } from "../mcp.sanitize";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
} from "../mcp.types";
import { withErrorHandling } from "../mcp.utils";

const mcpTeamSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  plan: z.string().nullable().optional(),
  connectorCount: z.number().nullable().optional(),
  memberCount: z.number().nullable().optional(),
  documentCount: z.number().nullable().optional(),
  createdAt: z.string().nullable().optional(),
});

const mcpTeamMemberSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  joinedAt: z.string().nullable().optional(),
});

export const registerTeamTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "teams.read")) {
    return;
  }

  registerAppTool(
    server,
    "team_info",
    {
      title: "Get Team Info",
      description:
        "Get current team details: name, slug, subscription plan, connector count, member count, document count, and creation date. Call this FIRST when you need team context — many other tools operate within the team scope returned here.\n\nReturns a single team object. No parameters required — uses the authenticated team. For team member details, use team_members.",
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
      _meta: { ui: { resourceUri: "ui://openbeam/team" } },
    },
    withErrorHandling(async () => {
      const result = await getTeamWithCounts(db, ctx.teamId);

      if (!result) {
        return {
          content: [{ type: "text" as const, text: "Team not found" }],
          isError: true,
        };
      }

      const clean = sanitize(mcpTeamSchema, {
        id: result.id,
        name: result.name,
        slug: result.slug,
        plan: result.subscriptionTier,
        connectorCount: result.connectorCount,
        memberCount: result.memberCount,
        documentCount: result.documentCount,
        createdAt: result.createdAt.toISOString(),
      });

      return {
        content: [{ type: "text" as const, text: formatTeamInfo(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to get team info")
  );

  registerAppTool(
    server,
    "team_members",
    {
      title: "List Team Members",
      description:
        "List all members of the current team with: name, email, role (admin/member/viewer), avatar URL, and join date. No parameters required.\n\nUse this when the user asks about team composition, roles, or needs a specific member's ID. The member ID can be used for filtering in other tools. For finding people across ALL connected directories (not just team members), use search_people instead.",
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
      _meta: { ui: { resourceUri: "ui://openbeam/team" } },
    },
    withErrorHandling(async () => {
      const results = await listTeamMembers(db, ctx.teamId);

      const clean = sanitizeArray(
        mcpTeamMemberSchema,
        results.map((m: Record<string, unknown>) => ({
          id: m.userId,
          name: m.name,
          email: m.email,
          role: m.role,
          avatarUrl: m.image,
          joinedAt:
            m.createdAt instanceof Date
              ? m.createdAt.toISOString()
              : String(m.createdAt ?? ""),
        }))
      );

      return {
        content: [{ type: "text" as const, text: formatTeamMembers(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to list team members")
  );
};
