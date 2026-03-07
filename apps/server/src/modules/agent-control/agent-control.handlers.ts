import type { RouteHandler } from "@hono/zod-openapi";
import prisma from "@openbeam/db";
import {
  addControlIssueCommentForTeam,
  appendRunEvent,
  ControlServiceError,
  checkoutControlIssueForTeam,
  completeRunWithResult,
  enqueueWakeup,
  getControlAgentForTeam,
  listControlIssuesForTeam,
  pauseControlAgentForTeam,
  releaseControlIssueForTeam,
  resumeControlAgentForTeam,
  updateControlIssueForTeam,
} from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import type {
  appendRunEventRoute,
  checkoutIssueRoute,
  commentIssueRoute,
  completeRunRoute,
  getIdentityRoute,
  listIssuesRoute,
  releaseIssueRoute,
  updateIssueRoute,
  updateStatusRoute,
  wakeupRoute,
} from "./agent-control.routes";

function getAgentId(c: {
  get: <K extends keyof AuthEnv["Variables"]>(
    key: K
  ) => AuthEnv["Variables"][K];
}): string {
  const ctx = c.get("authContext");
  if (ctx.type !== "agent") {
    throw new Error("Agent auth required");
  }
  return ctx.agentId;
}

function toError(err: unknown) {
  if (err instanceof ControlServiceError) {
    return { code: err.code, message: err.message };
  }
  return {
    code: "INTERNAL_ERROR",
    message: err instanceof Error ? err.message : "Unknown error",
  };
}

function isNotFound(err: unknown): err is ControlServiceError {
  return err instanceof ControlServiceError && err.code === "NOT_FOUND";
}

function isConflict(err: unknown): err is ControlServiceError {
  return err instanceof ControlServiceError && err.code === "CONFLICT";
}

export const getIdentityHandler: RouteHandler<
  typeof getIdentityRoute,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c) as string;
  const agentId = getAgentId(c);

  try {
    const record = await getControlAgentForTeam(prisma, teamId, agentId);
    return c.json(
      {
        agentId: record.id,
        teamId: record.teamId,
        name: record.name,
        role: record.role,
        status: record.status,
        capabilities: record.capabilities,
        permissions: record.permissions,
      },
      200
    );
  } catch (err) {
    if (isNotFound(err)) {
      return c.json({ error: toError(err) }, 404);
    }
    return c.json({ error: toError(err) }, 400);
  }
};

export const updateStatusHandler: RouteHandler<
  typeof updateStatusRoute,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c) as string;
  const agentId = getAgentId(c);
  const { status } = c.req.valid("json");

  try {
    if (status === "PAUSED") {
      await pauseControlAgentForTeam(prisma, teamId, agentId);
    } else if (status === "IDLE") {
      await resumeControlAgentForTeam(prisma, teamId, agentId);
    }
    return c.json({ ok: true }, 200);
  } catch (err) {
    if (isNotFound(err)) {
      return c.json({ error: toError(err) }, 404);
    }
    return c.json({ error: toError(err) }, 400);
  }
};

export const listIssuesHandler: RouteHandler<
  typeof listIssuesRoute,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c) as string;
  const agentId = getAgentId(c);
  const query = c.req.valid("query");

  try {
    const issues = await listControlIssuesForTeam(prisma, teamId, {
      status: query.status,
      assigneeAgentId: agentId,
      limit: query.limit,
      offset: query.offset,
    });
    return c.json({ items: issues, count: issues.length }, 200);
  } catch (err) {
    return c.json({ error: toError(err) }, 400);
  }
};

export const checkoutIssueHandler: RouteHandler<
  typeof checkoutIssueRoute,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c) as string;
  const { issueId } = c.req.valid("param");
  const body = c.req.valid("json");

  try {
    await checkoutControlIssueForTeam(prisma, {
      teamId,
      issueId,
      runId: body.runId,
      agentNameKey: body.agentNameKey,
      expectedStatuses: body.expectedStatuses,
    });
    return c.json({ ok: true }, 200);
  } catch (err) {
    if (isNotFound(err)) {
      return c.json({ error: toError(err) }, 404);
    }
    if (isConflict(err)) {
      return c.json({ error: toError(err) }, 409);
    }
    return c.json({ error: toError(err) }, 400);
  }
};

export const releaseIssueHandler: RouteHandler<
  typeof releaseIssueRoute,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c) as string;
  const { issueId } = c.req.valid("param");

  try {
    await releaseControlIssueForTeam(prisma, teamId, issueId);
    return c.json({ ok: true }, 200);
  } catch (err) {
    if (isNotFound(err)) {
      return c.json({ error: toError(err) }, 404);
    }
    return c.json({ error: toError(err) }, 400);
  }
};

export const commentIssueHandler: RouteHandler<
  typeof commentIssueRoute,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c) as string;
  const agentId = getAgentId(c);
  const { issueId } = c.req.valid("param");
  const { body } = c.req.valid("json");

  try {
    const result = await addControlIssueCommentForTeam(prisma, {
      teamId,
      issueId,
      body,
      authorAgentId: agentId,
    });
    return c.json(result, 200);
  } catch (err) {
    if (isNotFound(err)) {
      return c.json({ error: toError(err) }, 404);
    }
    return c.json({ error: toError(err) }, 400);
  }
};

export const updateIssueHandler: RouteHandler<
  typeof updateIssueRoute,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c) as string;
  const { issueId } = c.req.valid("param");
  const data = c.req.valid("json");

  try {
    await updateControlIssueForTeam(prisma, teamId, issueId, data);
    return c.json({ ok: true }, 200);
  } catch (err) {
    if (isNotFound(err)) {
      return c.json({ error: toError(err) }, 404);
    }
    return c.json({ error: toError(err) }, 400);
  }
};

export const wakeupHandler: RouteHandler<typeof wakeupRoute, AuthEnv> = async (
  c
) => {
  const teamId = getTeamId(c) as string;
  const agentId = getAgentId(c);
  const input = c.req.valid("json");

  try {
    const result = await enqueueWakeup(prisma, teamId, input.agentId, {
      source: input.source ?? "ON_DEMAND",
      reason: input.reason,
      payload: input.payload,
      idempotencyKey: input.idempotencyKey,
      requestedByActorType: "AGENT",
      requestedByActorId: agentId,
    });
    return c.json({ enqueued: result !== null, ...result }, 200);
  } catch (err) {
    return c.json({ error: toError(err) }, 400);
  }
};

export const appendRunEventHandler: RouteHandler<
  typeof appendRunEventRoute,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c) as string;
  const { runId } = c.req.valid("param");
  const body = c.req.valid("json");

  try {
    await appendRunEvent(prisma, {
      teamId,
      runId,
      agentId: body.agentId,
      seq: body.seq,
      eventType: body.eventType,
      stream: body.stream,
      level: body.level,
      message: body.message,
      payload: body.payload,
    });
    return c.json({ ok: true }, 200);
  } catch (err) {
    if (isNotFound(err)) {
      return c.json({ error: toError(err) }, 404);
    }
    return c.json({ error: toError(err) }, 400);
  }
};

export const completeRunHandler: RouteHandler<
  typeof completeRunRoute,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c) as string;
  const { runId } = c.req.valid("param");
  const body = c.req.valid("json");

  try {
    await completeRunWithResult(prisma, {
      teamId,
      agentId: body.agentId,
      runId,
      wakeupRequestId: body.wakeupRequestId,
      result: {
        exitCode: body.exitCode ?? null,
        signal: body.signal ?? null,
        timedOut: false,
        provider: body.provider ?? null,
        model: body.model ?? null,
        sessionId: body.sessionId ?? null,
        resultJson: (body.resultJson as Record<string, unknown>) ?? null,
        usage: body.usage
          ? {
              inputTokens: body.usage.inputTokens ?? 0,
              outputTokens: body.usage.outputTokens ?? 0,
              cachedInputTokens: body.usage.cachedInputTokens ?? 0,
            }
          : undefined,
      },
    });
    return c.json({ ok: true }, 200);
  } catch (err) {
    if (isNotFound(err)) {
      return c.json({ error: toError(err) }, 404);
    }
    return c.json({ error: toError(err) }, 400);
  }
};
