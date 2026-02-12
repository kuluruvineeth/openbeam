import type { ToolExecutionResult } from "@openplane/types/ai";
import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export interface MissionToolServices {
  readMemory: (input: {
    missionId: string;
    agentId?: string;
    key: string;
    scope?: string;
  }) => Promise<unknown>;
  writeMemory: (input: {
    missionId: string;
    agentId?: string;
    key: string;
    value: unknown;
    scope?: string;
  }) => Promise<void>;
  createArtifact: (input: {
    missionId: string;
    runId: string;
    title: string;
    type: string;
    content: unknown;
    url?: string;
  }) => Promise<{ artifactId: string }>;
  requestApproval: (input: {
    missionId: string;
    runId: string;
    agentId: string;
    intent: string;
    riskLevel: string;
    toolName: string;
    toolParams: Record<string, unknown>;
    riskFactors?: string[];
  }) => Promise<{ approvalId: string }>;
  updateTaskStatus: (input: {
    taskId: string;
    status: string;
    agentId: string;
    note?: string;
  }) => Promise<{ updated: boolean }>;
  createTask: (input: {
    missionId: string;
    agentId: string;
    title: string;
    description?: string;
    priority?: "P0" | "P1" | "P2" | "P3";
    dependsOn?: string[];
    requiredCapabilities?: string[];
  }) => Promise<{ taskId: string }>;
  sendFeedback: (input: {
    taskId: string;
    fromAgentId: string;
    feedback: string;
    targetAgentId?: string;
    reopen: boolean;
  }) => Promise<void>;
}

interface MissionToolContext {
  missionId: string;
  agentId: string;
  runId: string;
}

let missionServices: MissionToolServices | null = null;

export function setMissionToolServices(services: MissionToolServices): void {
  missionServices = services;
}

export function getMissionServices(): MissionToolServices {
  if (!missionServices) {
    throw new Error("Mission tool services not initialized");
  }
  return missionServices;
}

export function getMissionContext(ctx: unknown): MissionToolContext {
  const c = ctx as Record<string, unknown>;
  if (!(c.missionId && c.agentId && c.runId)) {
    throw new Error("Mission context required: missionId, agentId, runId");
  }
  return {
    missionId: c.missionId as string,
    agentId: c.agentId as string,
    runId: c.runId as string,
  };
}

const MEMORY_SCOPE = z
  .enum(["mission", "agent", "task"])
  .default("mission")
  .describe(
    "Scope of the memory entry: 'mission' for shared state, 'agent' for agent-private, 'task' for task-scoped"
  );

export const missionReadMemory = defineTool({
  name: "mission_read_memory",
  description:
    "Read a value from mission shared memory. Use this to retrieve previously stored state, coordination data, or intermediate results during mission execution.",
  category: "mission",
  searchKeywords: ["mission", "memory", "read", "state", "shared"],

  parameters: z.object({
    key: z.string().describe("The memory key to read"),
    scope: MEMORY_SCOPE,
  }),

  async execute(
    params,
    ctx
  ): Promise<
    ToolExecutionResult<{ key: string; value: unknown; found: boolean }>
  > {
    if (!missionServices) {
      return failure(
        "INVALID_STATE",
        "Mission tool services not initialized. Call setMissionToolServices before using mission tools."
      );
    }

    const mCtx = getMissionContext(ctx);

    const value = await missionServices.readMemory({
      missionId: mCtx.missionId,
      agentId: mCtx.agentId,
      key: params.key,
      scope: params.scope,
    });

    if (value === null || value === undefined) {
      return failure(
        "NOT_FOUND",
        `Key "${params.key}" not found in ${params.scope} scope`
      );
    }

    return success({ key: params.key, value, found: true });
  },
});

export const missionWriteMemory = defineTool({
  name: "mission_write_memory",
  description:
    "Write a value to mission shared memory. Use this to store state, coordination data, or intermediate results for other agents or future steps to consume.",
  category: "mission",
  searchKeywords: ["mission", "memory", "write", "state", "store", "shared"],

  parameters: z.object({
    key: z.string().describe("The memory key to write"),
    value: z.unknown().describe("The value to store"),
    scope: MEMORY_SCOPE,
  }),

  async execute(
    params,
    ctx
  ): Promise<ToolExecutionResult<{ written: boolean }>> {
    if (!missionServices) {
      return failure(
        "INVALID_STATE",
        "Mission tool services not initialized. Call setMissionToolServices before using mission tools."
      );
    }

    const mCtx = getMissionContext(ctx);

    await missionServices.writeMemory({
      missionId: mCtx.missionId,
      agentId: mCtx.agentId,
      key: params.key,
      value: params.value,
      scope: params.scope,
    });

    return success({ written: true });
  },
});
