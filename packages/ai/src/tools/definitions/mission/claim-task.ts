import type { ToolExecutionResult } from "@openplane/types/ai";
import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import { getMissionContext } from "./memory";

export interface MissionClaimServices {
  browseInbox: (input: {
    missionId: string;
    agentId: string;
    capabilities?: string[];
    limit?: number;
  }) => Promise<{
    tasks: Array<{
      id: string;
      title: string;
      description: string | null;
      priority: "P0" | "P1" | "P2" | "P3";
      requiredCapabilities: string[];
      dependsOn: string[];
      createdAt: number;
    }>;
  }>;
  requestAgentClaim: (input: {
    missionId: string;
    claimId: string;
    agentId: string;
    taskId: string;
    justification: string;
  }) => Promise<{ delivered: boolean }>;
}

let missionClaimServices: MissionClaimServices | null = null;

export function setMissionClaimServices(services: MissionClaimServices): void {
  missionClaimServices = services;
}

export function getMissionClaimServices(): MissionClaimServices | null {
  return missionClaimServices;
}

export const missionBrowseInbox = defineTool({
  name: "mission_browse_inbox",
  description:
    "Browse unassigned tasks available in the mission inbox. Returns tasks that have no assignee, are not blocked by dependencies, and match the agent's capabilities. Use this to discover work you can proactively claim.",
  category: "mission",
  deferLoading: true,
  searchKeywords: [
    "browse",
    "inbox",
    "tasks",
    "available",
    "unassigned",
    "claim",
  ],
  stakes: "low",
  reversibility: "easy",
  allowedCallers: ["agent"],
  parameters: z.object({
    capabilities: z
      .array(z.string())
      .optional()
      .describe("Filter tasks by required capabilities"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .default(10)
      .describe("Maximum number of tasks to return"),
  }),
  async execute(
    params,
    ctx
  ): Promise<
    ToolExecutionResult<{
      tasks: Array<{
        id: string;
        title: string;
        description: string | null;
        priority: string;
        requiredCapabilities: string[];
        createdAt: number;
      }>;
      count: number;
    }>
  > {
    if (!missionClaimServices) {
      return failure("INVALID_STATE", "Mission claim services not initialized");
    }

    const mCtx = getMissionContext(ctx);
    const result = await missionClaimServices.browseInbox({
      missionId: mCtx.missionId,
      agentId: mCtx.agentId,
      capabilities: params.capabilities,
      limit: params.limit,
    });

    return success({
      tasks: result.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        requiredCapabilities: task.requiredCapabilities,
        createdAt: task.createdAt,
      })),
      count: result.tasks.length,
    });
  },
});

export const missionClaimTask = defineTool({
  name: "mission_claim_task",
  description:
    "Claim an unassigned task from the mission inbox. The claim is validated by the orchestrator against budget, concurrency limits, and task availability. Provide a justification for why you are suited to handle this task.",
  category: "mission",
  deferLoading: true,
  searchKeywords: ["claim", "task", "self-assign", "pick", "volunteer", "take"],
  stakes: "medium",
  reversibility: "easy",
  allowedCallers: ["agent"],
  parameters: z.object({
    taskId: z.string().describe("The task ID to claim"),
    justification: z
      .string()
      .max(500)
      .describe("Why this agent is suited to handle this task"),
  }),
  async execute(
    params,
    ctx
  ): Promise<
    ToolExecutionResult<{
      claimId: string;
      status: "submitted";
      delivered: boolean;
    }>
  > {
    if (!missionClaimServices) {
      return failure("INVALID_STATE", "Mission claim services not initialized");
    }

    const mCtx = getMissionContext(ctx);
    const claimId = `claim-${mCtx.agentId}-${Date.now()}`;

    const result = await missionClaimServices.requestAgentClaim({
      missionId: mCtx.missionId,
      claimId,
      agentId: mCtx.agentId,
      taskId: params.taskId,
      justification: params.justification,
    });

    if (!result.delivered) {
      return failure("TIMEOUT", "Claim request could not reach orchestrator", {
        retryable: true,
        details: { claimId },
      });
    }

    return success({
      claimId,
      status: "submitted",
      delivered: result.delivered,
    });
  },
});
