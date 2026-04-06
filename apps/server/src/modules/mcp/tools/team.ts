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

type RawTeamResult = Awaited<ReturnType<typeof getTeamWithCounts>>;
type RawMemberResult = Record<string, unknown>;

function sanitizeTeam(result: NonNullable<RawTeamResult>) {
  return sanitize(mcpTeamSchema, {
    id: result.id,
    name: result.name,
    slug: result.slug,
    plan: result.subscriptionTier,
    connectorCount: result.connectorCount,
    memberCount: result.memberCount,
    documentCount: result.documentCount,
    createdAt: result.createdAt.toISOString(),
  });
}

function sanitizeMembers(results: RawMemberResult[]) {
  return sanitizeArray(
    mcpTeamMemberSchema,
    results.map((m) => ({
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
}

async function loadTeamAndMembers(teamId: string) {
  const [teamResult, memberResults] = await Promise.all([
    getTeamWithCounts(db, teamId),
    listTeamMembers(db, teamId),
  ]);

  return {
    team: teamResult ? sanitizeTeam(teamResult) : null,
    members: sanitizeMembers(memberResults),
  };
}

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
        "Get metadata and summary statistics for the current authenticated team. Use this when the user asks about their team, workspace, or account — or when you need team context to provide informed responses about data coverage, subscription capabilities, or organizational size.\n\nReturns a single team object containing: team ID, display name, URL slug, subscription plan (e.g. 'free', 'pro', 'enterprise'), total number of connected data source connectors, total number of team members, total number of indexed documents across all connectors, and team creation date. No parameters required — the team is determined by the authenticated API key.\n\nFor a detailed list of individual team members with their names, emails, roles, and join dates, use team_members instead. For details about specific connected data sources, use connector_list. For searching across indexed documents, use search_documents.\n\nDo NOT use this to find information about external people or contacts — use search_people for that. Do NOT use this to check connector health — use connector_list or connector_health.",
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
      _meta: { ui: { resourceUri: "ui://openbeam/team" } },
    },
    withErrorHandling(async () => {
      const { team, members } = await loadTeamAndMembers(ctx.teamId);

      if (!team) {
        return {
          content: [{ type: "text" as const, text: "Team not found" }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: formatTeamInfo(team) }],
        structuredContent: { team, members },
      };
    }, "Failed to get team info")
  );

  registerAppTool(
    server,
    "team_members",
    {
      title: "List Team Members",
      description:
        "List all members of the current OpenBeam team with their profile information and roles. Use this when the user asks about team composition ('who is on the team?'), wants to check someone's role or permissions, or needs to look up a specific team member's details.\n\nReturns each member's: user ID, full name, email address, role ('admin', 'member', or 'viewer' — admins can manage connectors and team settings, members can search and use tools, viewers have read-only access), avatar URL, and the date they joined the team. No parameters required — returns all members of the authenticated team.\n\nFor finding people across ALL connected enterprise directories (Google Workspace, Slack, Microsoft 365, etc.) — which includes external contacts, collaborators, and people who are not OpenBeam team members — use search_people instead. This tool only returns people who have OpenBeam accounts on this team.\n\nDo NOT use this to search for documents or content authored by a person — use search_documents with their name as the query for that.",
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
      _meta: { ui: { resourceUri: "ui://openbeam/team" } },
    },
    withErrorHandling(async () => {
      const { team, members } = await loadTeamAndMembers(ctx.teamId);

      return {
        content: [{ type: "text" as const, text: formatTeamMembers(members) }],
        structuredContent: { team, members },
      };
    }, "Failed to list team members")
  );
};
