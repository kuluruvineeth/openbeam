import type { RouteHandler } from "@hono/zod-openapi";
import prisma from "@openplane/db";
import {
  broadcastMissionForTeam,
  createMissionForTeam,
  getMissionCancelContextForTeam,
  getMissionForTeam,
  getMissionPauseContextForTeam,
  getMissionResumeContextForTeam,
  getMissionStartContextForTeam,
  listMissionsForTeam,
  MissionServiceError,
  markMissionCancelled,
  markMissionPaused,
  markMissionResumed,
  markMissionStarted,
  spawnMissionAgentForTeam,
  updateMissionForTeam,
} from "@openplane/services/missions";
import {
  cancelMission,
  pauseMission,
  resumeMission,
  startMission,
  wakeMission,
} from "@openplane/temporal";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import type {
  broadcastMissionRoute,
  cancelMissionRoute,
  createMissionRoute,
  getMissionRoute,
  listMissionsRoute,
  pauseMissionRoute,
  resumeMissionRoute,
  spawnMissionAgentRoute,
  startMissionRoute,
  updateMissionRoute,
} from "./missions.routes";

export const listMissionsHandler: RouteHandler<
  typeof listMissionsRoute,
  AuthEnv
> = async (c) => {
  const input = c.req.valid("query");

  try {
    const result = await listMissionsForTeam(prisma, {
      teamId: getTeamId(c),
      status: input.status,
      limit: input.limit,
      offset: input.offset,
    });

    return c.json(result, 200);
  } catch (error) {
    if (error instanceof MissionServiceError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process mission request" }, 400);
  }
};

export const createMissionHandler: RouteHandler<
  typeof createMissionRoute,
  AuthEnv
> = async (c) => {
  const input = c.req.valid("json");

  try {
    const mission = await createMissionForTeam(prisma, {
      teamId: getTeamId(c),
      authContext: c.get("authContext"),
      objective: input.objective,
      budgetCents: input.budgetCents,
      maxConcurrentRuns: input.maxConcurrentRuns,
      heartbeatIntervalMin: input.heartbeatIntervalMin,
      cronSchedule: input.cronSchedule,
    });

    return c.json(mission, 200);
  } catch (error) {
    if (error instanceof MissionServiceError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process mission request" }, 400);
  }
};

export const getMissionHandler: RouteHandler<
  typeof getMissionRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    const mission = await getMissionForTeam(prisma, {
      teamId: getTeamId(c),
      missionId: id,
    });

    return c.json(mission, 200);
  } catch (error) {
    if (error instanceof MissionServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process mission request" }, 400);
  }
};

export const updateMissionHandler: RouteHandler<
  typeof updateMissionRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  const input = c.req.valid("json");

  try {
    const updated = await updateMissionForTeam(prisma, {
      teamId: getTeamId(c),
      missionId: id,
      name: input.name,
      objective: input.objective,
      budgetCents: input.budgetCents,
      maxConcurrentRuns: input.maxConcurrentRuns,
      heartbeatIntervalMin: input.heartbeatIntervalMin,
    });

    return c.json(updated, 200);
  } catch (error) {
    if (error instanceof MissionServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process mission request" }, 400);
  }
};

export const startMissionHandler: RouteHandler<
  typeof startMissionRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    const startContext = await getMissionStartContextForTeam(prisma, {
      teamId: getTeamId(c),
      missionId: id,
    });

    const handle = await startMission({
      missionId: startContext.missionId,
      teamId: startContext.teamId,
      objective: startContext.objective,
      maxConcurrentRuns: startContext.maxConcurrentRuns,
      budgetCents: startContext.budgetCents,
      heartbeatIntervalMin: startContext.heartbeatIntervalMin,
    });

    await markMissionStarted(prisma, {
      missionId: startContext.missionId,
      workflowId: handle.workflowId,
      runId: handle.runId,
      previousRunId: startContext.previousRunId,
    });

    return c.json(
      { missionId: startContext.missionId, workflowId: handle.workflowId },
      200
    );
  } catch (error) {
    if (error instanceof MissionServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process mission request" }, 400);
  }
};

export const pauseMissionHandler: RouteHandler<
  typeof pauseMissionRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    const pauseContext = await getMissionPauseContextForTeam(prisma, {
      teamId: getTeamId(c),
      missionId: id,
      authContext: c.get("authContext"),
    });

    await pauseMission(pauseContext.missionId, pauseContext.actorId);
    await markMissionPaused(prisma, pauseContext.missionId);

    return c.json({ success: true }, 200);
  } catch (error) {
    if (error instanceof MissionServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process mission request" }, 400);
  }
};

export const resumeMissionHandler: RouteHandler<
  typeof resumeMissionRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    const resumeContext = await getMissionResumeContextForTeam(prisma, {
      teamId: getTeamId(c),
      missionId: id,
      authContext: c.get("authContext"),
    });

    await resumeMission(resumeContext.missionId, resumeContext.actorId);
    await markMissionResumed(prisma, resumeContext.missionId);

    return c.json({ success: true }, 200);
  } catch (error) {
    if (error instanceof MissionServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process mission request" }, 400);
  }
};

export const cancelMissionHandler: RouteHandler<
  typeof cancelMissionRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    const cancelContext = await getMissionCancelContextForTeam(prisma, {
      teamId: getTeamId(c),
      missionId: id,
      authContext: c.get("authContext"),
    });

    if (cancelContext.workflowId) {
      await cancelMission(cancelContext.missionId, cancelContext.actorId);
    }

    await markMissionCancelled(prisma, cancelContext.missionId);

    return c.json({ success: true }, 200);
  } catch (error) {
    if (error instanceof MissionServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process mission request" }, 400);
  }
};

export const spawnMissionAgentHandler: RouteHandler<
  typeof spawnMissionAgentRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  const input = c.req.valid("json");

  try {
    const result = await spawnMissionAgentForTeam(prisma, {
      teamId: getTeamId(c),
      missionId: id,
      authContext: c.get("authContext"),
      name: input.name,
      role: input.role,
      tools: input.tools,
      taskId: input.taskId,
    });

    if (result.wakeRequest) {
      await wakeMission(result.wakeRequest.missionId, {
        missionId: result.wakeRequest.missionId,
        reason: result.wakeRequest.reason,
        metadata: result.wakeRequest.metadata,
      });
    }

    return c.json(
      { success: true, agentId: result.agentId, taskId: result.taskId },
      200
    );
  } catch (error) {
    if (error instanceof MissionServiceError) {
      if (error.code === "NOT_FOUND" || error.code === "TASK_NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process mission request" }, 400);
  }
};

export const broadcastMissionHandler: RouteHandler<
  typeof broadcastMissionRoute,
  AuthEnv
> = async (c) => {
  const { id } = c.req.valid("param");
  const input = c.req.valid("json");

  try {
    const result = await broadcastMissionForTeam(prisma, {
      teamId: getTeamId(c),
      missionId: id,
      authContext: c.get("authContext"),
      content: input.content,
    });

    if (result.wakeRequest) {
      await wakeMission(result.wakeRequest.missionId, {
        missionId: result.wakeRequest.missionId,
        reason: result.wakeRequest.reason,
        metadata: result.wakeRequest.metadata,
      });
    }

    return c.json({ success: true, messageId: result.messageId }, 200);
  } catch (error) {
    if (error instanceof MissionServiceError) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to process mission request" }, 400);
  }
};
