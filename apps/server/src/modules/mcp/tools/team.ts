import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import db, { getTeamWithCounts, listTeamMembers } from "@openbeam/db";
import { z } from "zod";
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
        "Get current team details including name, plan, connector count, and member count. Call this first when you need team context for other operations.",
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
        content: [{ type: "text" as const, text: JSON.stringify(clean) }],
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
        "List all members of the current team with their name, email, role, and avatar. Use the member ID from the response when assigning tasks or filtering by user.",
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
        content: [{ type: "text" as const, text: JSON.stringify(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to list team members")
  );
};
