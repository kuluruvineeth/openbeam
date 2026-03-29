import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { hasScope, type McpContext } from "./mcp.types";

function userMsg(text: string) {
  return {
    messages: [
      { role: "user" as const, content: { type: "text" as const, text } },
    ],
  };
}

export function registerPrompts(server: McpServer, ctx: McpContext): void {
  if (hasScope(ctx, "connectors.read")) {
    server.prompt(
      "connector_setup",
      {
        description: "Walk through setting up a new data source connector",
        connectorType: z
          .string()
          .optional()
          .describe(
            "The type of connector to set up (e.g., slack, github, jira)"
          ),
      },
      ({ connectorType }) => {
        const type = connectorType ?? "new";
        return userMsg(
          `Guide me through setting up a ${type} connector for my team.\n\n` +
            "Steps:\n1. Read openbeam://team to check the current team configuration\n" +
            "2. Read openbeam://connector-types to show available types\n" +
            "3. Use connector_list to check for existing connectors\n" +
            "4. Walk through the OAuth or API key setup process\n" +
            "5. Verify the connection and initial sync"
        );
      }
    );

    server.prompt(
      "troubleshoot_sync",
      {
        description: "Diagnose and fix connector sync problems",
        connectorId: z
          .string()
          .optional()
          .describe("The ID of the connector having sync issues"),
      },
      ({ connectorId }) => {
        const clause = connectorId
          ? `Focus on connector ID: ${connectorId}.`
          : "Check all connectors.";
        return userMsg(
          `Help me troubleshoot connector sync problems. ${clause}\n\n` +
            "Steps:\n1. Use connector_list to get all connectors and status\n" +
            "2. Check sync history for failure patterns\n" +
            "3. Identify: expired tokens, rate limits, permission changes\n" +
            "4. Suggest specific fixes\n5. Verify fixes by checking sync resumes"
        );
      }
    );

    server.prompt(
      "data_overview",
      {
        description:
          "Comprehensive overview of all connected data sources and sync health",
      },
      () =>
        userMsg(
          "Provide a comprehensive overview of my team's connected data.\n\n" +
            "Steps:\n1. Read openbeam://team for team context\n" +
            "2. Use connector_list to get all sources with status\n" +
            "3. Summarize document counts and last sync per connector\n" +
            "4. Identify connectors with errors or stale syncs\n\n" +
            "Present as: summary table, health assessment, recommendations"
        )
    );
  }

  if (hasScope(ctx, "search.read")) {
    server.prompt(
      "search_analysis",
      {
        description: "Search and analyze enterprise data on a topic",
        topic: z.string().describe("The topic to research"),
        depth: z
          .enum(["quick", "standard", "deep"])
          .optional()
          .describe("Analysis depth"),
      },
      ({ topic, depth }) => {
        const d = depth ?? "standard";
        const instructions: Record<string, string> = {
          quick: "Brief summary from top 5 results.",
          standard:
            "Cross-reference sources, identify agreements and contradictions.",
          deep: "Multiple queries, comprehensive synthesis, identify patterns and gaps.",
        };
        return userMsg(
          `Research and analyze: "${topic}"\n\nDepth: ${d}\n${instructions[d]}\n\n` +
            "Steps:\n1. search_documents for relevant info\n2. Read full content of top results\n3. search_people for subject matter experts\n\n" +
            "Structure: executive summary, key findings with citations, gaps, next steps"
        );
      }
    );

    server.prompt(
      "find_expert",
      {
        description: "Find team members with expertise in a topic",
        topic: z.string().describe("The topic or skill"),
      },
      ({ topic }) =>
        userMsg(
          `Find team members with expertise in "${topic}".\n\n` +
            "Steps:\n1. search_documents for related content\n2. search_people for associated people\n3. Analyze authorship patterns\n\n" +
            "Provide: ranked experts, evidence, relevant documents, who to reach out to"
        )
    );

    server.prompt(
      "weekly_digest",
      {
        description: "Generate a weekly digest of changes across all sources",
        focusAreas: z
          .string()
          .optional()
          .describe("Comma-separated topics to prioritize"),
      },
      ({ focusAreas }) => {
        const focus = focusAreas
          ? `Prioritize: ${focusAreas}.`
          : "Cover all major topics.";
        return userMsg(
          `Generate a weekly knowledge digest. ${focus}\n\n` +
            "Steps:\n1. Read openbeam://documents/recent\n2. Search for notable updates\n3. Identify trending topics\n\n" +
            "Structure: top highlights, new docs by source, trending topics, action items"
        );
      }
    );
  }

  server.prompt(
    "onboarding_guide",
    { description: "Help a new user get started with OpenBeam" },
    () =>
      userMsg(
        "Help me get started with OpenBeam.\n\n" +
          "Steps:\n1. Read openbeam://user/context for permissions\n2. Read openbeam://team for team info\n" +
          "3. Read openbeam://connectors for connected sources\n4. Read openbeam://connector-types for available connectors\n\n" +
          "Provide: welcome overview, connected sources summary, example searches, tips, next steps"
      )
  );
}
