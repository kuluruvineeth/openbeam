import type { ToolExecutionResult } from "@openplane/types/ai";
import type {
  SandboxConfig,
  SpawnRegistryEntry,
} from "@openplane/types/temporal/mission";
import { SpawnAgentRequestSchema } from "@openplane/types/temporal/mission";
import { defineTool, failure, success } from "../../builder";
import { getMissionContext } from "./memory";

export interface MissionSpawnServices {
  requestAgentSpawn: (input: {
    missionId: string;
    requestId: string;
    requestingAgentId: string;
    taskDescription: string;
    requiredCapabilities: string[];
    suggestedTools?: string[];
    priority?: "P0" | "P1" | "P2" | "P3";
    maxSteps?: number;
    budgetCentsLimit?: number;
    dependsOnTaskId?: string;
    context?: string;
    sandboxConfig?: SandboxConfig;
  }) => Promise<{ requestId: string; delivered: boolean }>;
  getMissionAgents: (input: { missionId: string }) => Promise<{
    agents: Array<{
      id: string;
      name: string;
      role: string;
      level: string;
      capabilities: string[];
      tools: string[];
    }>;
  }>;
  getSpawnTree: (input: { missionId: string }) => Promise<{
    entries: SpawnRegistryEntry[];
  }>;
}

let missionSpawnServices: MissionSpawnServices | null = null;

export function setMissionSpawnServices(services: MissionSpawnServices): void {
  missionSpawnServices = services;
}

export function getMissionSpawnServices(): MissionSpawnServices | null {
  return missionSpawnServices;
}

const MissionSpawnAgentParametersSchema = SpawnAgentRequestSchema.omit({
  requestingAgentId: true,
});

export const missionSpawnAgent = defineTool({
  name: "mission_spawn_agent",
  description:
    "Request a new specialist agent for a focused sub-task inside the current mission. Use this when the sub-task requires capabilities that are not efficiently covered by the current agent.",
  category: "mission",
  deferLoading: true,
  searchKeywords: [
    "spawn",
    "create",
    "agent",
    "delegate",
    "specialist",
    "sub-agent",
  ],
  stakes: "medium",
  reversibility: "hard",
  allowedCallers: ["agent"],
  parameters: MissionSpawnAgentParametersSchema,
  async execute(
    params,
    ctx
  ): Promise<
    ToolExecutionResult<{
      requestId: string;
      status: "submitted";
      delivered: boolean;
    }>
  > {
    if (!missionSpawnServices) {
      return failure("INVALID_STATE", "Mission spawn services not initialized");
    }

    const mCtx = getMissionContext(ctx);
    const requestId = `spawn-${mCtx.agentId}-${Date.now()}`;
    const result = await missionSpawnServices.requestAgentSpawn({
      missionId: mCtx.missionId,
      requestId,
      requestingAgentId: mCtx.agentId,
      taskDescription: params.taskDescription,
      requiredCapabilities: params.requiredCapabilities,
      suggestedTools: params.suggestedTools,
      priority: params.priority,
      maxSteps: params.maxSteps,
      budgetCentsLimit: params.budgetCentsLimit,
      dependsOnTaskId: params.dependsOnTaskId,
      context: params.context,
      sandboxConfig: params.sandboxConfig,
    });

    if (!result.delivered) {
      return failure("TIMEOUT", "Spawn request could not reach orchestrator", {
        retryable: true,
        details: { requestId: result.requestId },
      });
    }

    return success({
      requestId: result.requestId,
      status: "submitted",
      delivered: result.delivered,
    });
  },
});
