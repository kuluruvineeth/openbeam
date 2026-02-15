import type { ToolExecutionResult } from "@openplane/types/ai";
import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import { getMissionContext, getTeamIdFromContext } from "./memory";

export interface MissionDelegationServices {
  discoverMissions: (input: {
    teamId: string;
    requiredCapabilities: string[];
    excludeMissionId: string;
  }) => Promise<{
    missions: Array<{
      missionId: string;
      objective: string;
      capabilities: string[];
      availableSlots: number;
      matchScore: number;
    }>;
  }>;
  delegateTask: (input: {
    sourceMissionId: string;
    targetMissionId: string;
    teamId: string;
    taskTitle: string;
    taskDescription: string;
    requiredCapabilities: string[];
    priority: "P0" | "P1" | "P2" | "P3";
    timeoutMs: number;
    context: Record<string, unknown>;
  }) => Promise<{ requestId: string; accepted: boolean; reason?: string }>;
}

let delegationServices: MissionDelegationServices | null = null;

export function setMissionDelegationServices(
  services: MissionDelegationServices
): void {
  delegationServices = services;
}

export const missionDiscoverMissions = defineTool({
  name: "mission_discover_missions",
  description:
    "Discover other active missions within the team that have specific capabilities.",
  category: "mission",
  parameters: z.object({
    requiredCapabilities: z
      .array(z.string())
      .describe("Capabilities needed from target mission"),
  }),
  async execute(
    params,
    ctx
  ): Promise<
    ToolExecutionResult<{
      missions: Array<{
        missionId: string;
        objective: string;
        capabilities: string[];
        availableSlots: number;
        matchScore: number;
      }>;
    }>
  > {
    if (!delegationServices) {
      return failure("INVALID_STATE", "Delegation services not initialized");
    }

    const missionContext = getMissionContext(ctx);
    const teamId = getTeamIdFromContext(ctx);
    const result = await delegationServices.discoverMissions({
      teamId,
      requiredCapabilities: params.requiredCapabilities,
      excludeMissionId: missionContext.missionId,
    });

    return success({ missions: result.missions });
  },
});

export const missionDelegateToMission = defineTool({
  name: "mission_delegate_to_mission",
  description: "Delegate a subtask to another active mission within the team.",
  category: "mission",
  parameters: z.object({
    targetMissionId: z.string(),
    taskTitle: z.string(),
    taskDescription: z.string(),
    requiredCapabilities: z.array(z.string()).default([]),
    priority: z.enum(["P0", "P1", "P2", "P3"]).default("P2"),
    timeoutMs: z.number().positive().default(300_000),
    context: z.record(z.string(), z.unknown()).default({}),
  }),
  async execute(
    params,
    ctx
  ): Promise<
    ToolExecutionResult<{
      requestId: string;
      accepted: boolean;
      reason?: string;
    }>
  > {
    if (!delegationServices) {
      return failure("INVALID_STATE", "Delegation services not initialized");
    }

    const missionContext = getMissionContext(ctx);
    const teamId = getTeamIdFromContext(ctx);
    const result = await delegationServices.delegateTask({
      sourceMissionId: missionContext.missionId,
      targetMissionId: params.targetMissionId,
      teamId,
      taskTitle: params.taskTitle,
      taskDescription: params.taskDescription,
      requiredCapabilities: params.requiredCapabilities,
      priority: params.priority,
      timeoutMs: params.timeoutMs,
      context: params.context,
    });

    return success(result);
  },
});
