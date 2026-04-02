import { ragAnswer } from "@openbeam/services";
import { z } from "zod";
import {
  formatAgentList,
  formatAgentRunResult,
  formatAgentStatus,
} from "../formatters/agents";
import { sanitize, sanitizeArray } from "../mcp.sanitize";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
  WRITE_ANNOTATIONS,
} from "../mcp.types";
import { truncateListResponse, withErrorHandling } from "../mcp.utils";

const AGENT_TEMPLATES = [
  {
    name: "research",
    description:
      "Deep document analysis agent. Searches enterprise data, retrieves relevant documents, and synthesizes a comprehensive answer with citations. Best for complex questions that require multi-source synthesis.",
    category: "analysis",
    estimatedDuration: "10-30s",
  },
  {
    name: "analyst",
    description:
      "Data analysis and summarization agent. Examines enterprise data to identify patterns, trends, and key insights. Best for questions about metrics, comparisons, and data-driven summaries.",
    category: "analysis",
    estimatedDuration: "15-45s",
  },
  {
    name: "writer",
    description:
      "Content generation agent. Drafts documents, emails, summaries, and reports grounded in enterprise data. Retrieves relevant context before writing to ensure accuracy.",
    category: "content",
    estimatedDuration: "15-60s",
  },
] as const;

type AgentName = (typeof AGENT_TEMPLATES)[number]["name"];

const AGENT_SYSTEM_PROMPTS: Record<AgentName, string> = {
  research: `You are a research agent for an enterprise search platform. Your task is to provide thorough, well-cited answers by synthesizing information from multiple enterprise documents.

<guidelines>
- Cite every factual claim using [n] notation referencing the source documents
- Structure complex answers with clear sections
- Acknowledge when information is incomplete or conflicting
- Prioritize recent, authoritative sources
</guidelines>`,

  analyst: `You are a data analysis agent for an enterprise search platform. Your task is to analyze enterprise data and surface meaningful patterns, trends, and insights.

<guidelines>
- Focus on quantitative observations when data supports them
- Compare and contrast information across sources
- Highlight anomalies or notable findings
- Provide actionable takeaways, not just raw data summaries
- Cite sources using [n] notation
</guidelines>`,

  writer: `You are a content writing agent for an enterprise search platform. Your task is to generate well-structured content grounded in enterprise data.

<guidelines>
- Write in clear, professional prose appropriate for the requested format
- Ground claims in retrieved enterprise documents, citing with [n] notation
- Match the tone and style to the content type (email, report, summary, etc.)
- Keep output focused and concise unless the user requests depth
</guidelines>`,
};

const VALID_AGENT_NAMES = AGENT_TEMPLATES.map((a) => a.name);

const mcpAgentTemplateSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  estimatedDuration: z.string(),
});

const mcpAgentRunSchema = z.object({
  agentName: z.string(),
  output: z.string(),
  stepsUsed: z.number(),
  durationMs: z.number(),
  citations: z
    .array(
      z.object({
        title: z.string().nullable().optional(),
        source: z.string().nullable().optional(),
      })
    )
    .nullable()
    .optional(),
});

export const registerAgentTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "search.read")) {
    return;
  }

  server.registerTool(
    "agent_list",
    {
      title: "List AI Agent Templates",
      description:
        "List the available AI agent templates that can be executed with agent_run. Each template is a specialized agent pattern optimized for a specific task type: research (multi-source document analysis and synthesis), analyst (data pattern identification and summarization), writer (content generation grounded in enterprise data).\n\nReturns each agent's name (pass to agent_run), description, category, and estimated execution duration. Use this to discover which agent best fits the user's task before running one.\n\nAfter choosing an agent, use agent_run with the agent name and a clear task description. For simple factual questions, prefer ask_question instead — agents are better suited for complex, multi-step tasks that benefit from deeper analysis.",
      inputSchema: {
        category: z
          .enum(["analysis", "content"])
          .optional()
          .describe(
            "Filter agents by category. 'analysis' = research and data analysis agents. 'content' = writing and content generation agents. Omit to list all agents."
          ),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling((params) => {
      const filtered = params.category
        ? AGENT_TEMPLATES.filter((a) => a.category === params.category)
        : AGENT_TEMPLATES;

      const data = sanitizeArray(
        mcpAgentTemplateSchema,
        filtered as unknown as Record<string, unknown>[]
      );

      const response = {
        meta: { totalResults: data.length, hasNextPage: false },
        data,
      };

      const { structuredContent } = truncateListResponse(response);

      return Promise.resolve({
        content: [{ type: "text" as const, text: formatAgentList(data) }],
        structuredContent,
      });
    }, "Failed to list agent templates")
  );

  server.registerTool(
    "agent_run",
    {
      title: "Run AI Agent",
      description:
        "Execute an AI agent to perform a complex task using enterprise data. The agent searches relevant documents, analyzes them, and produces a synthesized result with source citations. This is a synchronous call — the result is returned directly.\n\nAvailable agents (use agent_list to see full descriptions):\n- 'research' — multi-source document analysis and synthesis\n- 'analyst' — data pattern identification, comparisons, trend analysis\n- 'writer' — content generation (emails, reports, summaries) grounded in enterprise data\n\nThe agent retrieves up to maxSources enterprise documents relevant to the input task, then generates a response grounded in those sources. Results include the output text, source citations, steps taken, and execution duration.\n\nUse this for complex tasks that benefit from deeper analysis than ask_question provides. For simple factual lookups, prefer ask_question. For browsing documents, use search_documents.",
      inputSchema: {
        agentName: z
          .string()
          .describe(
            "The agent template to execute. One of: 'research', 'analyst', 'writer'. Use agent_list to see descriptions of each."
          ),
        input: z
          .string()
          .min(1)
          .describe(
            "The task for the agent to perform. Be specific and include context. Examples: 'Summarize all decisions from last week\\'s engineering syncs', 'Draft an email update about the Q1 product roadmap', 'Analyze trends in customer support tickets over the past month'."
          ),
        maxSources: z.coerce
          .number()
          .min(1)
          .max(20)
          .optional()
          .describe(
            "Maximum number of source documents to retrieve and analyze, between 1 and 20. Defaults to 8. Use higher values for broad synthesis tasks, lower for focused lookups."
          ),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      if (!VALID_AGENT_NAMES.includes(params.agentName as AgentName)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Unknown agent "${params.agentName}". Available agents: ${VALID_AGENT_NAMES.join(", ")}. Use agent_list to see descriptions.`,
            },
          ],
          isError: true,
        };
      }

      const agentName = params.agentName as AgentName;
      const startTime = Date.now();

      const accessControlIds = [
        `team:${ctx.teamId}`,
        ctx.userId,
        ctx.userEmail,
      ].filter(Boolean) as string[];

      const ragResult = await ragAnswer({
        query: params.input,
        teamId: ctx.teamId,
        accessControlIds,
        topK: params.maxSources ?? 8,
        systemPrompt: AGENT_SYSTEM_PROMPTS[agentName],
      });

      const durationMs = Date.now() - startTime;

      const result = {
        agentName,
        output: ragResult.answer,
        stepsUsed: 1,
        durationMs,
        citations: ragResult.citations.map((c) => ({
          title: c.title,
          source: c.connectorType ?? null,
        })),
      };

      const clean = sanitize(mcpAgentRunSchema, result);

      return {
        content: [{ type: "text" as const, text: formatAgentRunResult(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to execute agent")
  );

  server.registerTool(
    "agent_status",
    {
      title: "Check Agent Execution Status",
      description:
        "Check the status of an agent execution. Currently, all agent executions via agent_run are synchronous — results are returned immediately. This tool is a placeholder for future async execution support via Temporal workflows.\n\nWhen async execution is available, this tool will accept an execution ID and return real-time progress (steps completed, current stage, partial results). For now, it returns a status message explaining the synchronous execution model.",
      inputSchema: {
        executionId: z
          .string()
          .optional()
          .describe(
            "The execution ID to check. Currently unused — agent execution is synchronous. Will be used when async execution via Temporal is available."
          ),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(
      async () => ({
        content: [{ type: "text" as const, text: formatAgentStatus() }],
        structuredContent: {
          data: {
            mode: "synchronous",
            asyncSupported: false,
            message:
              "Agent execution is synchronous. Results are returned immediately from agent_run.",
          },
        },
      }),
      "Failed to check agent status"
    )
  );
};
