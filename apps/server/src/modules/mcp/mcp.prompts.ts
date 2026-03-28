import type { PromptHandler, PromptRegistry } from "@openbeam/ai";
import type { MCPPromptDefinition } from "@openbeam/types/ai";
import { hasScope, type McpContext } from "./mcp.types";

function userMessage(text: string) {
  return {
    messages: [
      {
        role: "user" as const,
        content: { type: "text" as const, text },
      },
    ],
  };
}

function prompt(
  fn: (args: Record<string, string>) => ReturnType<typeof userMessage>
): PromptHandler {
  return (args) => Promise.resolve(fn(args));
}

export function registerPrompts(
  registry: PromptRegistry,
  ctx: McpContext
): void {
  if (hasScope(ctx, "connectors.read")) {
    const connectorSetup: MCPPromptDefinition = {
      name: "connector_setup",
      description: "Walk through setting up a new data source connector",
      arguments: [
        {
          name: "connectorType",
          description:
            "The type of connector to set up (e.g., slack, github, jira, notion)",
          required: false,
        },
      ],
    };

    registry.register(
      connectorSetup,
      prompt((args) => {
        const type = args.connectorType ?? "new";
        return userMessage(
          `Guide me through setting up a ${type} connector for my team.\n\n` +
            "Follow these steps:\n" +
            "1. Read openbeam://team to check the current team configuration\n" +
            "2. Read openbeam://connector-types to show available connector types\n" +
            "3. Use list_connectors to check for existing connectors of this type\n" +
            "4. Walk through the OAuth or API key setup process\n" +
            "5. Verify the connection works and initial sync starts\n\n" +
            "Explain each step clearly and handle any errors that come up."
        );
      })
    );
  }

  if (hasScope(ctx, "connectors.read")) {
    const troubleshootSync: MCPPromptDefinition = {
      name: "troubleshoot_sync",
      description:
        "Diagnose and fix connector sync problems with step-by-step investigation",
      arguments: [
        {
          name: "connectorId",
          description: "The ID of the connector having sync issues",
          required: false,
        },
      ],
    };

    registry.register(
      troubleshootSync,
      prompt((args) => {
        const connectorClause = args.connectorId
          ? `Focus on connector ID: ${args.connectorId}.`
          : "Check all connectors for issues.";

        return userMessage(
          `Help me troubleshoot connector sync problems. ${connectorClause}\n\n` +
            "Investigation steps:\n" +
            "1. Use list_connectors to get all connectors and their current status\n" +
            "2. For connectors in error state, check their sync history for failure patterns\n" +
            "3. Identify common issues: expired OAuth tokens, rate limits, permission changes\n" +
            "4. Suggest specific fixes for each problem found\n" +
            "5. Verify fixes by checking if sync resumes successfully\n\n" +
            "Provide a clear diagnosis with actionable remediation steps."
        );
      })
    );
  }

  if (hasScope(ctx, "search.read")) {
    const searchAnalysis: MCPPromptDefinition = {
      name: "search_analysis",
      description:
        "Search and analyze enterprise data across all connected sources on a specific topic",
      arguments: [
        {
          name: "topic",
          description: "The topic or question to research across all sources",
          required: true,
        },
        {
          name: "depth",
          description:
            "Analysis depth: quick (top results only), standard (cross-reference sources), deep (comprehensive synthesis)",
          required: false,
        },
      ],
    };

    registry.register(
      searchAnalysis,
      prompt((args) => {
        const depth = args.depth ?? "standard";
        const depthInstructions =
          {
            quick: "Provide a brief summary from the top 5 search results.",
            standard:
              "Cross-reference multiple sources, identify agreements and contradictions, provide a balanced synthesis.",
            deep: "Perform multiple searches with different query formulations, analyze all relevant documents, identify patterns and gaps, provide a comprehensive research report.",
          }[depth] ??
          "Cross-reference multiple sources and provide a balanced synthesis.";

        return userMessage(
          `Research and analyze: "${args.topic}"\n\n` +
            "Approach:\n" +
            `1. Use search_documents to find relevant information about "${args.topic}"\n` +
            "2. Use get_document to read the full content of the most relevant results\n" +
            "3. Use search_people to identify subject matter experts if relevant\n\n" +
            `Analysis depth: ${depth}\n${depthInstructions}\n\n` +
            "Structure your analysis with:\n" +
            "- Executive summary\n" +
            "- Key findings with citations\n" +
            "- Source credibility assessment\n" +
            "- Gaps in available information\n" +
            "- Recommended next steps"
        );
      })
    );
  }

  if (hasScope(ctx, "search.read")) {
    const findExpert: MCPPromptDefinition = {
      name: "find_expert",
      description:
        "Find team members with expertise in a specific topic based on their contributions and document interactions",
      arguments: [
        {
          name: "topic",
          description: "The topic or skill to find experts for",
          required: true,
        },
      ],
    };

    registry.register(
      findExpert,
      prompt((args) =>
        userMessage(
          `Find team members with expertise in "${args.topic}".\n\n` +
            "Steps:\n" +
            `1. Use search_documents to find content related to "${args.topic}"\n` +
            `2. Use search_people to find people associated with "${args.topic}"\n` +
            "3. Analyze document authorship and contribution patterns\n\n" +
            "Provide:\n" +
            "- Ranked list of potential experts\n" +
            "- Evidence supporting each person's expertise\n" +
            "- Relevant documents they authored or contributed to\n" +
            "- Suggested people to reach out to first"
        )
      )
    );
  }

  if (hasScope(ctx, "connectors.read")) {
    const dataOverview: MCPPromptDefinition = {
      name: "data_overview",
      description:
        "Get a comprehensive overview of all connected data sources, document counts, and sync health",
    };

    registry.register(
      dataOverview,
      prompt(() =>
        userMessage(
          "Provide a comprehensive overview of my team's connected data.\n\n" +
            "Steps:\n" +
            "1. Read openbeam://team for team context\n" +
            "2. Use list_connectors to get all connected sources with status\n" +
            "3. For each active connector, summarize document counts and last sync time\n" +
            "4. Identify any connectors with errors or stale sync times\n\n" +
            "Present:\n" +
            "- Summary table of all connectors (name, type, status, last sync, doc count)\n" +
            "- Overall health assessment\n" +
            "- Recommendations for improving data coverage\n" +
            "- Suggested new connectors based on common enterprise setups"
        )
      )
    );
  }

  if (hasScope(ctx, "search.read")) {
    const weeklyDigest: MCPPromptDefinition = {
      name: "weekly_digest",
      description:
        "Generate a weekly digest of important changes and new information across all connected sources",
      arguments: [
        {
          name: "focusAreas",
          description:
            "Comma-separated topics to prioritize (e.g., 'product launches, hiring, engineering')",
          required: false,
        },
      ],
    };

    registry.register(
      weeklyDigest,
      prompt((args) => {
        const focusClause = args.focusAreas
          ? `Prioritize information related to: ${args.focusAreas}.`
          : "Cover all major topics.";

        return userMessage(
          `Generate a weekly knowledge digest for my team. ${focusClause}\n\n` +
            "Steps:\n" +
            "1. Read openbeam://documents/recent for recently indexed content\n" +
            "2. Use search_documents with broad queries to find notable updates\n" +
            "3. Identify trending topics and significant changes\n\n" +
            "Structure the digest as:\n" +
            "- Top highlights (3-5 most important items)\n" +
            "- New documents by source\n" +
            "- Trending topics this week\n" +
            "- Action items or decisions that need attention\n" +
            "- Key people involved in recent activity"
        );
      })
    );
  }

  const onboarding: MCPPromptDefinition = {
    name: "onboarding_guide",
    description:
      "Help a new user get started with OpenBeam by exploring available data and capabilities",
  };

  registry.register(
    onboarding,
    prompt(() =>
      userMessage(
        "Help me get started with OpenBeam as a new user.\n\n" +
          "Steps:\n" +
          "1. Read openbeam://user/context to understand my current permissions\n" +
          "2. Read openbeam://team for team information\n" +
          "3. Read openbeam://connectors to see what data sources are connected\n" +
          "4. Read openbeam://connector-types to show what else can be connected\n\n" +
          "Then provide:\n" +
          "- A welcome overview of what's available\n" +
          "- Summary of connected data sources and what I can search\n" +
          "- 3-5 example searches I can try right now\n" +
          "- Tips for getting the most out of enterprise search\n" +
          "- Suggested next steps based on my team's setup"
      )
    )
  );
}
