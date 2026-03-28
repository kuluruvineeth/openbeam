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

  server.registerTool(
    "team_info",
    {
      title: "Get Team Info",
      description:
        "Get current team details including name, plan, connector count, and member count. Call this first when you need team context for other operations.",
      inputSchema: {},
      outputSchema: {
        data: z.record(z.string(), z.any()),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async () => {
      const result = await Promise.resolve(null as unknown);

      if (!result) {
        return {
          content: [{ type: "text" as const, text: "Team not found" }],
          isError: true,
        };
      }

      const clean = sanitize(mcpTeamSchema, result);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to get team info")
  );

  server.registerTool(
    "team_members",
    {
      title: "List Team Members",
      description:
        "List all members of the current team with their name, email, role, and avatar. Use the member ID from the response when assigning tasks or filtering by user.",
      inputSchema: {},
      outputSchema: {
        data: z.array(z.record(z.string(), z.any())),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async () => {
      const results = await Promise.resolve([] as unknown[]);

      const clean = sanitizeArray(mcpTeamMemberSchema, results);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to list team members")
  );
};
