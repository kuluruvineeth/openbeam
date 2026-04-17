import { CATALOG_AGENTS, type CatalogAgent } from "@openbeam/computer";
import prisma, {
  createComputerAgent,
  createComputerRun,
  getComputerAgentBySlug,
  getComputerAgentForRun,
  getComputerAgents,
  getComputerRuns,
} from "@openbeam/db";
import { startComputerRun } from "@openbeam/temporal";
import { z } from "zod";
import {
  formatComputerAgentEnabled,
  formatComputerAgents,
  formatComputerCatalog,
  formatComputerConfirmed,
  formatComputerGenerated,
  formatComputerRuns,
  formatComputerRunTriggered,
} from "../formatters";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
  WRITE_ANNOTATIONS,
} from "../mcp.types";
import { withErrorHandling } from "../mcp.utils";

export const registerComputerTools: RegisterTools = (server, ctx) => {
  const { teamId, userId } = ctx;

  if (!(hasScope(ctx, "computer.read") || hasScope(ctx, "teams.read"))) {
    return;
  }

  server.registerTool(
    "computer_catalog_list",
    {
      title: "List Agent Catalog",
      description:
        "List available pre-built AI agents that can be enabled to automate enterprise workflows. " +
        "Returns name, description, and schedule for each catalog agent (e.g., Knowledge Digest, Connector Health Monitor, Compliance Watchdog). " +
        "Use this FIRST before computer_agent_enable to see available agents. " +
        "After finding an agent, use computer_agent_enable with its templateId to install it. " +
        "Do NOT use this for listing already-enabled agents — use computer_agents_list instead.",
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async () => {
      const catalog = await Promise.resolve(
        CATALOG_AGENTS.map(
          ({
            templateId,
            name,
            slug,
            description,
            scheduleCron,
          }: CatalogAgent) => ({
            templateId,
            name,
            slug,
            description,
            scheduleCron,
          })
        )
      );
      return {
        content: [
          { type: "text" as const, text: formatComputerCatalog(catalog) },
        ],
        structuredContent: { data: catalog },
      };
    }, "Failed to list catalog")
  );

  server.registerTool(
    "computer_agents_list",
    {
      title: "List Team Agents",
      description:
        "List all AI agents enabled for the current team, including ID, name, schedule, and status (ACTIVE, PAUSED, DRAFT). " +
        "Use this when the user asks about their agents, automation, or scheduled tasks. " +
        "Returns the agentId needed for computer_agent_run and computer_agent_runs. " +
        "Do NOT use this to browse the catalog — use computer_catalog_list instead.",
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async () => {
      const agents = await getComputerAgents(prisma, teamId);
      return {
        content: [
          {
            type: "text" as const,
            text: formatComputerAgents(
              agents as Parameters<typeof formatComputerAgents>[0]
            ),
          },
        ],
        structuredContent: { data: agents },
      };
    }, "Failed to list agents")
  );

  server.registerTool(
    "computer_agent_runs",
    {
      title: "List Agent Runs",
      description:
        "List recent runs for a specific agent, including status, summary, errors, and timing. " +
        "Use this to check what an agent found or whether a run completed successfully.",
      inputSchema: {
        agentId: z.string().describe("The agent ID"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(10)
          .describe("Number of runs to return (default 10)"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params: { agentId: string; limit?: number }) => {
      const runs = await getComputerRuns(
        prisma,
        params.agentId,
        teamId,
        params.limit ?? 10
      );
      return {
        content: [
          {
            type: "text" as const,
            text: formatComputerRuns(
              params.agentId,
              runs as Parameters<typeof formatComputerRuns>[1]
            ),
          },
        ],
        structuredContent: { data: runs },
      };
    }, "Failed to list runs")
  );

  if (!(hasScope(ctx, "computer.write") || hasScope(ctx, "teams.write"))) {
    return;
  }

  server.registerTool(
    "computer_agent_enable",
    {
      title: "Enable Catalog Agent",
      description:
        "Install and enable a pre-built agent from the catalog. " +
        "Pass the templateId from computer_catalog_list. " +
        "The agent starts running on its defined schedule immediately.",
      inputSchema: {
        templateId: z
          .string()
          .describe("The templateId of the catalog agent to enable"),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    withErrorHandling(async (params: { templateId: string }) => {
      const template = CATALOG_AGENTS.find(
        (a: CatalogAgent) => a.templateId === params.templateId
      );
      if (!template) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Template not found. Use computer_catalog_list to see available agents.",
            },
          ],
          isError: true,
        };
      }

      const existing = await getComputerAgentBySlug(
        prisma,
        teamId,
        template.slug
      );
      if (existing) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Agent "${template.name}" is already enabled.`,
            },
          ],
          isError: true,
        };
      }

      const agent = await createComputerAgent(prisma, {
        teamId,
        name: template.name,
        slug: template.slug,
        description: template.description,
        source: "CATALOG",
        code: template.code,
        templateId: template.templateId,
        scheduleCron: template.scheduleCron,
        status: "ACTIVE",
        createdBy: userId,
      });

      return {
        content: [
          { type: "text" as const, text: formatComputerAgentEnabled(agent) },
        ],
        structuredContent: { data: agent },
      };
    }, "Failed to enable agent")
  );

  server.registerTool(
    "computer_agent_run",
    {
      title: "Run Agent Now",
      description:
        "Trigger an immediate manual run of an agent (e.g., run connector health check now, generate a knowledge digest). " +
        "Returns the run ID which can be used to check status via computer_agent_runs. " +
        "The agent must be ACTIVE — use computer_agents_list to verify status first.",
      inputSchema: {
        agentId: z.string().describe("The agent ID to run"),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    withErrorHandling(async (params: { agentId: string }) => {
      const agent = await getComputerAgentForRun(
        prisma,
        params.agentId,
        teamId
      );
      if (!agent) {
        return {
          content: [{ type: "text" as const, text: "Agent not found." }],
          isError: true,
        };
      }
      if (agent.status !== "ACTIVE") {
        return {
          content: [{ type: "text" as const, text: "Agent is not active." }],
          isError: true,
        };
      }

      const runId = crypto.randomUUID();
      await createComputerRun(prisma, {
        id: runId,
        agentId: params.agentId,
        teamId,
        triggeredBy: "MANUAL",
        triggeredByUser: userId,
      });

      await startComputerRun({
        agentId: params.agentId,
        teamId,
        runId,
        agentName: agent.name,
        triggerType: "MANUAL",
        triggeredByUser: userId,
      });

      return {
        content: [
          { type: "text" as const, text: formatComputerRunTriggered(runId) },
        ],
        structuredContent: { data: { runId, status: "pending" } },
      };
    }, "Failed to run agent")
  );

  server.registerTool(
    "computer_agent_generate",
    {
      title: "Generate Custom Agent",
      description:
        "Generate a custom AI agent from a natural language description (e.g., 'monitor Slack for unanswered questions', 'weekly report on content gaps'). " +
        "Returns a plan with name, schedule, code, and tools it will use. " +
        "The user must review and confirm before deployment via computer_agent_confirm. " +
        "Do NOT deploy without user confirmation.",
      inputSchema: {
        description: z
          .string()
          .min(10)
          .describe("Natural language description of what the agent should do"),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    withErrorHandling(async (params: { description: string }) => {
      const { connectMcpPair, generateAgentFromDescription } = await import(
        "@openbeam/computer"
      );
      const { createOpenBeamMcpServer } = await import("../mcp.factory");

      const mcpCtx = {
        teamId: ctx.teamId,
        userId: ctx.userId,
        userEmail: ctx.userEmail,
        scopes: ["admin:*"],
        timezone: ctx.timezone,
        locale: ctx.locale,
      };
      const mcpServer = createOpenBeamMcpServer(mcpCtx);
      const mcp = await connectMcpPair(mcpServer);

      try {
        const result = await generateAgentFromDescription(
          params.description,
          mcp.client
        );
        return {
          content: [
            { type: "text" as const, text: formatComputerGenerated(result) },
          ],
          structuredContent: { data: result },
        };
      } finally {
        await mcp.close();
      }
    }, "Failed to generate agent")
  );

  server.registerTool(
    "computer_agent_confirm",
    {
      title: "Deploy Generated Agent",
      description:
        "Deploy a previously generated agent after user has reviewed the plan. " +
        "Pass the exact name, slug, code, and description from computer_agent_generate.",
      inputSchema: {
        name: z.string().describe("Agent display name"),
        slug: z.string().describe("URL-safe unique slug"),
        description: z.string().describe("What the agent does"),
        code: z.string().describe("Compiled JavaScript code"),
        scheduleCron: z
          .string()
          .optional()
          .describe("Cron expression for scheduling"),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    withErrorHandling(
      async (params: {
        name: string;
        slug: string;
        description: string;
        code: string;
        scheduleCron?: string;
      }) => {
        const existing = await getComputerAgentBySlug(
          prisma,
          teamId,
          params.slug
        );
        if (existing) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Agent with slug "${params.slug}" already exists.`,
              },
            ],
            isError: true,
          };
        }

        const agent = await createComputerAgent(prisma, {
          teamId,
          name: params.name,
          slug: params.slug,
          description: params.description,
          source: "GENERATED",
          code: params.code,
          scheduleCron: params.scheduleCron,
          status: "ACTIVE",
          createdBy: userId,
        });

        return {
          content: [
            { type: "text" as const, text: formatComputerConfirmed(agent) },
          ],
          structuredContent: { data: agent },
        };
      },
      "Failed to deploy agent"
    )
  );
};
