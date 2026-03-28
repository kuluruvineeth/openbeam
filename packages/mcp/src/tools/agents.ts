import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  type AgentProgress,
  getAgentArtifacts,
  getAgentProgress,
  startAgent,
} from "@openbeam/temporal";

const VALID_PRESETS = [
  "researcher",
  "coder",
  "analyst",
  "writer",
  "custom",
] as const;

export const agentTools: Tool[] = [
  {
    name: "run_agent",
    description:
      "Start an async agent job. Returns a job_id immediately — use get_job_status to poll for progress and results. Agent presets: researcher, coder, analyst, writer, custom.",
    inputSchema: {
      type: "object",
      properties: {
        agent_preset: {
          type: "string",
          enum: [...VALID_PRESETS],
          description: "Agent type to run",
        },
        prompt: {
          type: "string",
          description: "The task prompt for the agent",
        },
        max_steps: {
          type: "number",
          description: "Maximum steps the agent can take (1-50)",
          default: 10,
        },
      },
      required: ["agent_preset", "prompt"],
    },
  },
  {
    name: "get_job_status",
    description:
      "Check the status of an async agent or research job. Returns progress, status, and result if complete.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: {
          type: "string",
          description: "The job_id returned by run_agent or deep_research",
        },
      },
      required: ["job_id"],
    },
  },
  {
    name: "deep_research",
    description:
      "Start an async deep research job on a question. Returns a job_id immediately — use get_job_status to poll for progress and results. Depth controls thoroughness: quick (1-2 min), standard (3-5 min), deep (5-10 min).",
    inputSchema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The research question",
        },
        depth: {
          type: "string",
          enum: ["quick", "standard", "deep"],
          description: "Research depth level",
          default: "standard",
        },
      },
      required: ["question"],
    },
  },
];

function formatProgress(progress: AgentProgress): Record<string, unknown> {
  return {
    job_id: progress.workflowId,
    status: progress.status,
    steps_completed: progress.steps,
    has_artifacts: progress.artifacts.length > 0,
    last_checkpoint: progress.lastCheckpoint
      ? {
          step: progress.lastCheckpoint.step,
          timestamp: progress.lastCheckpoint.timestamp,
        }
      : null,
  };
}

const DEPTH_TO_MAX_STEPS: Record<string, number> = {
  quick: 5,
  standard: 15,
  deep: 30,
};

export async function handleAgentTool(
  teamId: string,
  userId: string,
  name: string,
  args: Record<string, unknown> | undefined
): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  try {
    switch (name) {
      case "run_agent": {
        const agentPreset = args?.agent_preset as string;
        const prompt = args?.prompt as string;
        const maxSteps = Math.min(
          Math.max((args?.max_steps as number) ?? 10, 1),
          50
        );

        if (
          !VALID_PRESETS.includes(agentPreset as (typeof VALID_PRESETS)[number])
        ) {
          return {
            content: [
              {
                type: "text",
                text: `Invalid agent_preset: ${agentPreset}. Valid: ${VALID_PRESETS.join(", ")}`,
              },
            ],
            isError: true,
          };
        }

        const handle = await startAgent({
          agentType: agentPreset,
          teamId,
          userId,
          prompt,
          maxSteps,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  job_id: handle.workflowId,
                  status: "started",
                  message: "Use get_job_status to check progress",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_job_status": {
        const jobId = args?.job_id as string;

        const progress = await getAgentProgress(jobId);

        if (!progress) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    job_id: jobId,
                    status: "not_found",
                    message:
                      "Job not found. It may have completed and been cleaned up, or the ID is invalid.",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const result: Record<string, unknown> = formatProgress(progress);

        if (progress.status === "completed" || progress.status === "error") {
          const artifacts = await getAgentArtifacts(jobId);
          result.artifacts = artifacts;
        }

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "deep_research": {
        const question = args?.question as string;
        const depth = (args?.depth as string) ?? "standard";
        const maxSteps = DEPTH_TO_MAX_STEPS[depth] ?? 15;

        const handle = await startAgent({
          agentType: "researcher",
          teamId,
          userId,
          prompt: question,
          maxSteps,
          context: { researchDepth: depth },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  job_id: handle.workflowId,
                  status: "started",
                  depth,
                  message: "Use get_job_status to check progress",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown agent tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
}
