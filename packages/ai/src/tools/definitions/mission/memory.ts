import type { ToolExecutionResult } from "@openplane/types/ai";
import type { ReviewGatingConfig } from "@openplane/types/temporal/mission";
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
  checkReviewGating: (input: {
    missionId: string;
    taskId: string;
    taskPriority: "P0" | "P1" | "P2" | "P3";
    reviewGating: ReviewGatingConfig;
  }) => Promise<{
    gated: boolean;
    reason: string;
    requiredReviewers: number;
    completedReviews: number;
  }>;
}

interface MissionToolContext {
  missionId: string;
  agentId: string;
  runId: string;
  reviewGating?: ReviewGatingConfig;
  taskPriority?: "P0" | "P1" | "P2" | "P3";
}

const VALID_PRIORITIES = new Set(["P0", "P1", "P2", "P3"]);

function getStringValue(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return null;
}

function getMetadataValue(
  ctx: Record<string, unknown>,
  key: string
): string | null {
  const metadata = ctx.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return getStringValue((metadata as Record<string, unknown>)[key]);
}

function resolveContextValue(c: Record<string, unknown>, key: string): unknown {
  if (c[key] !== undefined) {
    return c[key];
  }
  if (
    c.metadata &&
    typeof c.metadata === "object" &&
    !Array.isArray(c.metadata)
  ) {
    return (c.metadata as Record<string, unknown>)[key];
  }
  return;
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

export function getTeamIdFromContext(ctx: unknown): string {
  const root = (ctx as Record<string, unknown>) ?? {};
  if (typeof root.teamId === "string" && root.teamId.length > 0) {
    return root.teamId;
  }

  const metadata = root.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const metadataTeamId = (metadata as Record<string, unknown>).teamId;
    if (typeof metadataTeamId === "string" && metadataTeamId.length > 0) {
      return metadataTeamId;
    }
  }

  throw new Error("Team context required: teamId must be present");
}

export function getMissionContext(ctx: unknown): MissionToolContext {
  const c = ctx as Record<string, unknown>;
  const missionId =
    getStringValue(c.missionId) ?? getMetadataValue(c, "missionId");
  const agentId = getStringValue(c.agentId) ?? getMetadataValue(c, "agentId");
  const runId = getStringValue(c.runId) ?? getMetadataValue(c, "runId");

  if (!(missionId && agentId && runId)) {
    throw new Error("Mission context required: missionId, agentId, runId");
  }

  const rawGating = resolveContextValue(c, "reviewGating");
  const rawPriority = resolveContextValue(c, "taskPriority");

  return {
    missionId,
    agentId,
    runId,
    reviewGating:
      rawGating &&
      typeof rawGating === "object" &&
      !Array.isArray(rawGating) &&
      "policy" in rawGating
        ? (rawGating as ReviewGatingConfig)
        : undefined,
    taskPriority:
      typeof rawPriority === "string" && VALID_PRIORITIES.has(rawPriority)
        ? (rawPriority as MissionToolContext["taskPriority"])
        : undefined,
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
